/* eslint-disable no-console */
// Measures tsc type instantiations for a generated N-route schema.
// Usage: node bench/instantiations.mjs [--routes 150] [--calls 60] [--depth 3] [--src ./src]

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? fallback : args[index + 1]
}

function count(name, fallback, minimum) {
  const value = Number(arg(name, fallback))
  if (!Number.isInteger(value) || value < minimum) {
    console.error(`--${name} must be an integer >= ${minimum}, received ${arg(name, fallback)}`)
    process.exit(1)
  }
  return value
}

const routes = count('routes', 150, 1)
const calls = count('calls', 60, 0)
const depth = count('depth', 3, 1)
const root = fileURLToPath(new URL('..', import.meta.url))
const src = path.resolve(root, arg('src', 'src'))

const paths = []
const tree = {}
for (let i = 0; i < routes; i++) {
  const segments = []
  for (let level = 0; level < depth - 1; level++) {
    segments.push(`/group${(i + level) % 8}`)
  }
  segments.push(`/route${i}`)

  const dynamic = i % 3 === 0

  let node = tree
  for (const segment of segments) {
    node[segment] ||= {}
    node = node[segment]
  }
  if (dynamic) {
    node['[DynamicParam]'] ||= {}
    node = node['[DynamicParam]']
  }
  node['[Endpoint]'] = `{ GET: { response: { id: number, route: '${i}' } }, POST: { body: { id: number }, response: { ok: true } } }`

  paths.push(segments.join('') + (dynamic ? '/1' : ''))
}

function stringify(node, indent = 2) {
  let output = ''
  for (const [key, value] of Object.entries(node)) {
    const name = key.startsWith('[') ? key : `'${key}'`
    output += typeof value === 'string'
      ? `${' '.repeat(indent)}${name}: ${value}\n`
      : `${' '.repeat(indent)}${name}: {\n${stringify(value, indent + 2)}${' '.repeat(indent)}}\n`
  }
  return output
}

const schema = stringify(tree)

const dir = mkdtempSync(path.join(tmpdir(), 'fetchdts-bench-'))
mkdirSync(dir, { recursive: true })

// module specifiers always use forward slashes, including on Windows
const specifier = name => path.join(src, name).replaceAll(path.sep, '/')

let source = `import type { DynamicParam, Endpoint } from '${specifier('tree')}'\n`
source += `import type { TypedFetchInput, TypedFetchRequestInit, TypedFetchResponseBody } from '${specifier('inference')}'\n`
source += `import type { Trimmed } from '${specifier('utils')}'\n\n`
source += `interface Schema {\n${schema}}\n\n`
source += `declare function $fetch<T extends TypedFetchInput<Schema>, Init extends TypedFetchRequestInit<Schema, T>>(input: T, init?: Init): TypedFetchResponseBody<Schema, Trimmed<T>, 'GET'>\n\n`
for (let i = 0; i < calls; i++) {
  const index = i % paths.length
  source += `export const result${i} = $fetch('${paths[index]}')\n`
  // an unresolved path yields `never`, which would otherwise satisfy every annotation and make a broken matcher look cheap
  source += `const resolved${i}: true = 0 as unknown as [typeof result${i}] extends [never] ? false : true\n`
  source += `void resolved${i}\n`
}

writeFileSync(path.join(dir, 'index.ts'), source)
writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    strict: true,
    target: 'es2022',
    lib: ['DOM', 'es2022'],
    module: 'preserve',
    moduleResolution: 'bundler',
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
  include: ['index.ts'],
}, null, 2))

// the `.bin` shim is a `.cmd` file on Windows, which `execFileSync` cannot run directly
const tsc = path.join(root, 'node_modules/typescript/bin/tsc')

try {
  let output
  try {
    output = execFileSync(process.execPath, [tsc, '-p', dir, '--extendedDiagnostics'], { encoding: 'utf8' })
  }
  catch (error) {
    output = error.stdout || ''
    const errors = output.split('\n').filter(line => line.includes(': error TS'))
    console.error(errors.length > 0
      ? `${errors.length} type errors in generated fixture, first:\n${errors[0]}`
      : `tsc failed without diagnostics:\n${error.stderr || error.message}`)
    process.exitCode = 1
  }

  const wanted = ['Instantiations', 'Types', 'Memory used', 'Total time', 'Check time']
  console.log(`routes=${routes} calls=${calls} depth=${depth} src=${path.relative(root, src) || 'src'}`)
  for (const line of output.split('\n')) {
    if (wanted.some(key => line.startsWith(key))) {
      console.log(`  ${line.trim()}`)
    }
  }
}
finally {
  rmSync(dir, { recursive: true, force: true })
}

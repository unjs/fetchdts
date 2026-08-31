/* eslint-disable no-console */
// Measures tsc type instantiations for a generated N-route schema.
// Usage: node bench/instantiations.mjs [--routes 150] [--calls 60] [--depth 3] [--src ./src]
//                                      [--siblings 0] [--template] [--ambiguous] [--valid-input]
//                                      [--overloads] [--eager-init]
//
// --siblings adds N static routes alongside each dynamic one, and --template requests the dynamic
// routes with a template literal (`/a/b/${string}`) rather than a concrete path, which together
// measure what a template-literal request costs when its node has static siblings.
//
// --ambiguous emits an `ambiguousResponse` on each dynamic endpoint, as a caller that precomputes
// the union of its static siblings would, which is what a template-literal request then resolves to.
//
// --valid-input constrains the input with `ValidFetchInput` in parameter position instead of
// the union of every path, which is the shape to prefer on a large generated schema.
//
// --overloads pairs that signature with a second one constrained to the union, which is what keeps
// path completions in an editor. This is the documented default; measure it against --valid-input to
// see what the completion overload costs.
//
// --eager-init constrains a generic to the init type instead of using it in parameter position,
// which forces the init to be computed for the whole path union before any call site is checked.
// It is the shape to avoid in a client, and is kept measurable because the cost is easy to
// reintroduce by accident and dwarfs everything else.

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
const siblings = count('siblings', 0, 0)
const template = args.includes('--template')
const ambiguous = args.includes('--ambiguous')
const eagerInit = args.includes('--eager-init')
const validInput = args.includes('--valid-input')
const overloads = args.includes('--overloads')
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
  const parent = node
  if (dynamic) {
    node['[DynamicParam]'] ||= {}
    node = node['[DynamicParam]']
  }
  const overlapping = dynamic && ambiguous
    ? `, ambiguousResponse: { id: number, route: '${i}' }${Array.from({ length: siblings }, (_, sibling) => ` | { sibling: ${sibling} }`).join('')}`
    : ''
  node['[Endpoint]'] = `{ GET: { response: { id: number, route: '${i}' }${overlapping} }, POST: { body: { id: number }, response: { ok: true } } }`

  if (dynamic) {
    for (let sibling = 0; sibling < siblings; sibling++) {
      parent[`/sibling${sibling}`] ||= { '[Endpoint]': `{ GET: { response: { sibling: ${sibling} } } }` }
    }
  }

  paths.push({ prefix: segments.join(''), dynamic })
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

// module specifiers always use forward slashes, including on Windows, and are quoted rather than
// interpolated so that a project path containing a quote still emits valid TypeScript
const specifier = name => JSON.stringify(path.join(src, name).replaceAll(path.sep, '/'))

let source = `import type { DynamicParam, Endpoint } from ${specifier('tree')}\n`
source += `import type { AnyHTTPMethod } from ${specifier('inference')}\n`
source += `import type { TypedFetchInput, TypedFetchRequestInit, TypedFetchResponseBody, ValidFetchInput } from ${specifier('inference')}\n`
source += `import type { Trimmed } from ${specifier('utils')}\n\n`
source += `interface Schema {\n${schema}}\n\n`
source += eagerInit
  ? `declare function $fetch<T extends TypedFetchInput<Schema>, Init extends TypedFetchRequestInit<Schema, T>>(input: T, init?: Init): TypedFetchResponseBody<Schema, Trimmed<T>, 'GET'>\n\n`
  : overloads
    ? `declare function $fetch<T extends TypedFetchInput<Schema>, M extends AnyHTTPMethod = 'GET'>(input: T & ValidFetchInput<Schema, T, M>, init?: TypedFetchRequestInit<Schema, T, M> & { method?: M }): TypedFetchResponseBody<Schema, T, M>\ndeclare function $fetch<T extends string, M extends AnyHTTPMethod = 'GET'>(input: T & ValidFetchInput<Schema, T, M>, init?: TypedFetchRequestInit<Schema, T, M> & { method?: M }): TypedFetchResponseBody<Schema, T, M>\n\n`
    : validInput
      ? `declare function $fetch<T extends string, M extends AnyHTTPMethod = 'GET'>(input: T & ValidFetchInput<Schema, T, M>, init?: TypedFetchRequestInit<Schema, T, M> & { method?: M }): TypedFetchResponseBody<Schema, Trimmed<T>, M>\n\n`
      : `declare function $fetch<T extends TypedFetchInput<Schema>, M extends AnyHTTPMethod = 'GET'>(input: T, init?: TypedFetchRequestInit<Schema, T, M> & { method?: M }): TypedFetchResponseBody<Schema, Trimmed<T>, M>\n\n`
source += 'declare const param: string\n\n'
for (let i = 0; i < calls; i++) {
  const { prefix, dynamic } = paths[i % paths.length]
  const input = dynamic
    ? template ? `\`${prefix}/\${param}\`` : `'${prefix}/1'`
    : `'${prefix}'`
  source += `export const result${i} = $fetch(${input})\n`
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
  console.log(`routes=${routes} calls=${calls} depth=${depth}${siblings > 0 ? ` siblings=${siblings}` : ''}${template ? ' template' : ''}${ambiguous ? ' ambiguous' : ''}${validInput ? ' valid-input' : ''}${overloads ? ' overloads' : ''}${eagerInit ? ' eager-init' : ''} src=${path.relative(root, src) || 'src'}`)
  for (const line of output.split('\n')) {
    if (wanted.some(key => line.startsWith(key))) {
      console.log(`  ${line.trim()}`)
    }
  }
}
finally {
  rmSync(dir, { recursive: true, force: true })
}

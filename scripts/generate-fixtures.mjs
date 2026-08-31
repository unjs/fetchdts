// Regenerates the compiled fixtures the type tests resolve against, so those tests exercise the
// compiler's actual output rather than a hand-written approximation of it.
// Usage: npx vite-node scripts/generate-fixtures.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compileRoutes } from '../src/compiler'
import { DynamicParam, WildcardParam } from '../src/tree'

const routes = [
  { segments: ['/api', '/health'], metadata: { GET: { responseType: '{ status: \'ok\' }' } } },
  { segments: ['/api', '/users'], metadata: { GET: { responseType: '{ id: number }[]' }, POST: { bodyType: '{ name: string }', responseType: '{ id: number }', errorResponseType: '{ message: string }' } } },
  { segments: ['/api', '/users', DynamicParam], metadata: { GET: { responseType: '{ id: number, name: string }', responseHeadersType: '{ \'x-cache\': \'hit\' | \'miss\' }' } } },
  { segments: [{ type: 'static', value: 'api/users' }, { type: 'dynamic' }, { type: 'static', value: 'posts' }], metadata: { GET: { responseType: '{ title: string }[]' } } },
  { segments: ['/api', '/comments', '/latest'], metadata: { GET: { responseType: '{ latest: true }' } } },
  { segments: ['/api', '/comments', DynamicParam], metadata: { GET: { responseType: '{ body: string }' } } },
  { segments: ['/api', '/ping'], metadata: { ALL: { responseType: '\'pong\'' } } },
  { segments: ['/api', '/search'], metadata: { ALL: { responseType: '{ results: string[] }' }, POST: { bodyType: '{ query: string }', responseType: '{ results: string[], total: number }' } } },
  { segments: ['/api', '/proxy'], metadata: { ALL: {} } },
  { segments: ['/api', '/files', WildcardParam], metadata: { GET: { responseType: 'Blob' } } },
]

const external = [
  { segments: ['/v1', '/posts'], metadata: { GET: { responseType: '{ id: number }[]' } } },
  { segments: ['/v1', '/posts', DynamicParam], metadata: { GET: { responseType: '{ id: number }' } } },
]

const compiled = compileRoutes(
  [{ routes }, { routes: external, origin: 'https://api.example.com' }],
  { name: 'GeneratedRoutes' },
)

const target = fileURLToPath(new URL('../test/fixture/generated.ts', import.meta.url))
writeFileSync(target, `${compiled.code}\n`)

// the same route set, with the accessors resolving against an interface a consumer can extend
const augmentable = compileRoutes(
  [{ routes }, { routes: external, origin: 'https://api.example.com' }],
  {
    name: 'CompiledRoutes',
    resolveAgainst: 'ExtensibleRoutes',
    imports: ['import type { ExtensibleRoutes } from \'./extensible\''],
  },
)
const augmentableTarget = fileURLToPath(new URL('../test/fixture/generated-extensible.ts', import.meta.url))
writeFileSync(augmentableTarget, `${augmentable.code}\n`)

console.log(`${target}: strategy ${compiled.strategy}, ${JSON.stringify(compiled.stats)}`)

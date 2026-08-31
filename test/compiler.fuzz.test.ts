/* eslint-disable no-template-curly-in-string */
import type { Route, RouteSegment } from '../src/compiler'
import fc from 'fast-check'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { compileRoutes } from '../src/compiler'
import { DynamicParam, WildcardParam } from '../src/tree'

/** the compiler takes route sets, and an origin is user input like any other segment */
const origins = [undefined, 'https://api.example.com', 'http://localhost:3000', ...hostileOrigins()]

function hostileOrigins(): Array<string | undefined> {
  return ['', '://', '//', 'constructor', '\u0060', '${x}']
}

function compile(routes: Route[], options?: Parameters<typeof compileRoutes>[1]): string {
  return compileRoutes([{ routes }], { name: 'Schema', ...options }).code
}

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE', 'ALL'] as const
const fields = ['queryType', 'headersType', 'bodyType', 'responseType', 'ambiguousResponseType', 'responseHeadersType', 'errorResponseType'] as const

/** type sources are opaque to the serializer, so they are drawn from a pool of valid ones */
const typeSources = ['string', 'number', 'unknown', 'never', 'User', 'Post[]', 'A | B', '{ id: number }', 'Record<string, string>', '`/${string}`']

const hostileStrings = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '[Endpoint]',
  '[DynamicParam]',
  'Type',
  'contentType',
  '',
  '/',
  '"',
  '\\',
  '\n',
  '${x}',
  '*/ evil /*',
  'https://api.example.com',
  '//',
  '://',
]

const staticValue = fc.oneof(
  { arbitrary: fc.constantFrom(...hostileStrings), weight: 3 },
  { arbitrary: fc.string(), weight: 2 },
  { arbitrary: fc.string({ unit: 'binary' }), weight: 1 },
)

const segment: fc.Arbitrary<RouteSegment> = fc.oneof(
  { arbitrary: staticValue, weight: 4 },
  { arbitrary: staticValue.map(value => ({ type: 'static', value }) as const), weight: 2 },
  { arbitrary: fc.constantFrom(DynamicParam, WildcardParam), weight: 2 },
  { arbitrary: fc.constantFrom({ type: 'dynamic' } as const, { type: 'wildcard' } as const), weight: 2 },
)

/**
 * A generator on the other side of a tool boundary is not bound by the declared types, so method
 * names and metadata fields are fuzzed with inherited-property names as well as real ones.
 */
const inherited = fc.constantFrom('__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty')

const metadata = fc.dictionary(
  fc.oneof({ arbitrary: fc.constantFrom(...methods), weight: 4 }, { arbitrary: inherited, weight: 1 }) as fc.Arbitrary<typeof methods[number]>,
  fc.oneof(
    fc.constant(undefined),
    fc.constant(null as never),
    fc.dictionary(
      fc.oneof({ arbitrary: fc.constantFrom(...fields), weight: 4 }, { arbitrary: inherited, weight: 1 }) as fc.Arbitrary<typeof fields[number]>,
      fc.oneof({ arbitrary: fc.constantFrom(...typeSources), weight: 6 }, { arbitrary: fc.constant(undefined as never), weight: 1 }),
    ),
  ),
  { maxKeys: 4 },
)

/** a wildcard consumes the remainder of a path, so a route ends at the first one */
function untilWildcard(segments: RouteSegment[]): RouteSegment[] {
  const index = segments.findIndex(part => part === WildcardParam || (typeof part === 'object' && part.type === 'wildcard'))
  return index === -1 ? segments : segments.slice(0, index + 1)
}

const route: fc.Arbitrary<Route> = fc.record({
  segments: fc.array(segment, { minLength: 0, maxLength: 5 }).map(untilWildcard),
  metadata: fc.oneof(fc.constant(undefined), metadata),
}, { requiredKeys: ['segments'] }) as fc.Arbitrary<Route>

const routes = fc.array(route, { maxLength: 8 })

const params = { numRuns: 500 }

function syntaxErrors(code: string): string[] {
  const source = ts.createSourceFile('schema.ts', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const diagnostics = (source as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? []
  return diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' '))
}

describe('compileRoutes (property-based)', () => {
  it('should emit syntactically valid TypeScript for any route set', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = compile(routes)
      expect(syntaxErrors(output)).toEqual([])
      expect(output).toContain('export interface Schema')
    }), params)
  })

  it('should emit syntactically valid TypeScript for any origin, and for either strategy', () => {
    fc.assert(fc.property(routes, fc.constantFrom(...origins), fc.constantFrom(0, 1, 200), (routes, origin, unionLimit) => {
      const output = compileRoutes([{ routes, origin }], { name: 'Schema', unionLimit }).code
      expect(syntaxErrors(output)).toEqual([])
    }), params)
  })

  it('should emit the same names whichever strategy is chosen', () => {
    const names = ['ValidInput', 'Response', 'ResponseHeaders', 'ErrorBody', 'RequestBody', 'RequestQuery', 'RequestHeaders', 'Requires', 'Path']
    for (const strategy of ['table', 'table+union', 'tree', 'tree+union'] as const) {
      const output = compileRoutes([{ routes: [{ segments: ['/a'], metadata: { GET: { responseType: 'A' } } }] }], { name: 'Schema', strategy }).code
      for (const name of names) {
        expect(output).toContain(`export type ${name}`)
      }
      expect(syntaxErrors(output)).toEqual([])
    }
  })

  it('should either reject an interface name or emit valid TypeScript for it', () => {
    const names = fc.oneof(
      fc.string(),
      fc.constantFrom('Schema', '$', '_x', 'interface', 'class', 'enum', 'do', 'await', 'static', 'yield', 'let', 'package', 'implements', 'true', 'null', 'void', 'function', 'string', 'any', 'type'),
    )
    fc.assert(fc.property(names, (name) => {
      let output: string
      try {
        output = compile([], { name })
      }
      catch (error) {
        expect(error).toBeInstanceOf(TypeError)
        return
      }
      expect(syntaxErrors(output)).toEqual([])
    }), params)
  })

  it('should reject a segment it cannot represent', () => {
    expect(() => compile([{ segments: [{ type: 'unknown' } as never] }])).toThrow(/Unknown route segment/)
    expect(() => compile([{ segments: [{ type: 'static', value: 42 as never }] }])).toThrow(/must be strings/)
  })

  it('should reject a module specifier it cannot emit', () => {
    expect(() => compile([], { moduleSpecifier: 'a\'b' })).toThrow(/not a valid module specifier/)
    expect(() => compile([], { moduleSpecifier: 42 as never })).toThrow(/not a valid module specifier/)
    expect(compile([], { moduleSpecifier: 'nuxt/app' })).toContain('from \'nuxt/app\'')
  })

  it('should be deterministic and insensitive to duplicated routes', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = compile(routes)
      expect(compile(structuredCloneRoutes(routes))).toBe(output)
      expect(compile([...routes, ...routes])).toBe(output)
    }), params)
  })

  it('should import exactly the symbols it references', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = compile(routes)
      const line = output.split('\n').find(line => line.startsWith('import type'))!
      const imported = new Set(line.slice(line.indexOf('{') + 1, line.indexOf('}')).split(',').map(s => s.trim()))
      // the vocabulary is imported for the tree; the accessors are imported unconditionally and
      // mention `AnyHTTPMethod`, so the check is scoped to the tree itself
      const tree = output.slice(output.indexOf('interface Schema'), output.indexOf('\n}') + 2)

      for (const symbol of ['DynamicParam', 'WildcardParam', 'Endpoint']) {
        expect(imported.has(symbol)).toBe(tree.includes(`[${symbol}]:`))
      }
      expect(imported.has('HTTPMethod')).toBe(/\bHTTPMethod\b/.test(tree))
      // `AnyFetchPath` stands in for the path union where one is not emitted
      expect(imported.has('AnyFetchPath')).toBe(output.includes('export type Path = AnyFetchPath'))
      expect([...imported]).toEqual([...imported].sort())
    }), params)
  })

  it('should never leak host object properties into the output', () => {
    fc.assert(fc.property(routes, (routes) => {
      // a static segment may legitimately contain any of these, so only the value side is checked
      for (const value of values(compile(routes))) {
        expect(value).not.toContain('native code')
        expect(value).not.toContain('function')
        expect(value).not.toContain('[object')
      }
    }), params)
  })

  it('should not mutate the routes it is given', () => {
    fc.assert(fc.property(routes, (routes) => {
      const before = JSON.stringify(routes, (_, value) => typeof value === 'symbol' ? String(value) : value)
      compile(routes)
      expect(JSON.stringify(routes, (_, value) => typeof value === 'symbol' ? String(value) : value)).toBe(before)
    }), params)
  })

  it('should represent every path segment of every route in the output', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = compile(routes)
      for (const route of routes) {
        for (const segment of route.segments) {
          if (typeof segment === 'symbol' || (typeof segment !== 'string' && segment.type !== 'static')) {
            continue
          }
          const value = typeof segment === 'string' ? segment : segment.value
          // a static segment is emitted as one key per path segment, and contributes no key where it
          // holds none of them
          for (const key of keysOf(value)) {
            expect(output).toContain(JSON.stringify(key))
          }
        }
      }
    }), params)
  })
})

/** the normal form of a static segment: an origin, then one key per path segment */
function keysOf(value: string): string[] {
  const origin = value.match(/^[a-z][a-z\d+\-.]*:\/\/[^/]*/i)?.[0]
  const path = origin ? value.slice(origin.length) : value
  const segments = path.split('/').filter(segment => segment !== '').map(segment => `/${segment}`)
  return origin ? [origin, ...segments] : segments
}

function structuredCloneRoutes(routes: Route[]): Route[] {
  return routes.map(route => ({ ...route, segments: [...route.segments] }))
}

/**
 * The value of each emitted property, with the key discarded. Keys are `[Symbol]` or a JSON string,
 * and a JSON string never contains a raw newline, so one property occupies exactly one line.
 */
function values(output: string): string[] {
  const values: string[] = []
  for (const line of output.split('\n')) {
    const property = line.trimStart()
    const key = property.startsWith('[')
      ? property.slice(0, property.indexOf(']') + 1)
      : property.startsWith('"') ? jsonStringPrefix(property) : undefined
    if (key === undefined || !property.slice(key.length).startsWith(': ')) {
      continue
    }
    values.push(property.slice(key.length + 2))
  }
  return values
}

function jsonStringPrefix(property: string): string {
  for (let index = 1; index < property.length; index++) {
    if (property[index] === '\\') {
      index++
      continue
    }
    if (property[index] === '"') {
      return property.slice(0, index + 1)
    }
  }
  return property
}

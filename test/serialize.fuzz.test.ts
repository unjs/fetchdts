/* eslint-disable no-template-curly-in-string */
import type { Route, RouteSegment } from '../src'
import fc from 'fast-check'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { DynamicParam, serializeRoutes, WildcardParam } from '../src'

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'CONNECT', 'TRACE', 'ALL'] as const
const fields = ['queryType', 'headersType', 'bodyType', 'responseType', 'ambiguousResponseType', 'responseHeadersType'] as const

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

const route: fc.Arbitrary<Route> = fc.record({
  segments: fc.array(segment, { minLength: 0, maxLength: 5 }),
  metadata: fc.oneof(fc.constant(undefined), metadata),
}, { requiredKeys: ['segments'] }) as fc.Arbitrary<Route>

const routes = fc.array(route, { maxLength: 8 })

const params = { numRuns: 500 }

function syntaxErrors(code: string): string[] {
  const source = ts.createSourceFile('schema.ts', code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const diagnostics = (source as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? []
  return diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' '))
}

describe('serializeRoutes (property-based)', () => {
  it('should emit syntactically valid TypeScript for any route set', () => {
    fc.assert(fc.property(routes, fc.boolean(), (routes, exported) => {
      const output = serializeRoutes('Schema', routes, { export: exported })
      expect(syntaxErrors(output)).toEqual([])
      expect(output.includes('export interface Schema')).toBe(exported)
    }), params)
  })

  it('should either reject an interface name or emit valid TypeScript for it', () => {
    const names = fc.oneof(
      fc.string(),
      fc.constantFrom('Schema', '$', '_x', 'interface', 'class', 'enum', 'do', 'await', 'static', 'yield', 'let', 'package', 'implements', 'true', 'null', 'void', 'function', 'string', 'any', 'type'),
    )
    fc.assert(fc.property(names, (name) => {
      let output: string
      try {
        output = serializeRoutes(name, [])
      }
      catch (error) {
        expect(error).toBeInstanceOf(TypeError)
        return
      }
      expect(syntaxErrors(output)).toEqual([])
    }), params)
  })

  it('should reject a segment it cannot represent', () => {
    expect(() => serializeRoutes('Schema', [{ segments: [{ type: 'unknown' } as never] }])).toThrow(/Unknown route segment/)
    expect(() => serializeRoutes('Schema', [{ segments: [{ type: 'static', value: 42 as never }] }])).toThrow(/must be strings/)
  })

  it('should be deterministic and insensitive to duplicated routes', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = serializeRoutes('Schema', routes)
      expect(serializeRoutes('Schema', structuredCloneRoutes(routes))).toBe(output)
      expect(serializeRoutes('Schema', [...routes, ...routes])).toBe(output)
    }), params)
  })

  it('should import exactly the symbols it references', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = serializeRoutes('Schema', routes)
      const [first] = output.split('\n')
      const imported = new Set(first!.startsWith('import type')
        ? first!.slice(first!.indexOf('{') + 1, first!.indexOf('}')).split(',').map(s => s.trim())
        : [])
      const body = output.slice(output.indexOf('interface Schema'))

      for (const symbol of ['DynamicParam', 'WildcardParam', 'Endpoint']) {
        expect(imported.has(symbol)).toBe(body.includes(`[${symbol}]:`))
      }
      expect(imported.has('HTTPMethod')).toBe(body.includes('HTTPMethod'))
      expect([...imported]).toEqual([...imported].sort())
    }), params)
  })

  it('should never leak host object properties into the output', () => {
    fc.assert(fc.property(routes, (routes) => {
      // a static segment may legitimately contain any of these, so only the value side is checked
      for (const value of values(serializeRoutes('Schema', routes))) {
        expect(value).not.toContain('native code')
        expect(value).not.toContain('function')
        expect(value).not.toContain('[object')
      }
    }), params)
  })

  it('should not mutate the routes it is given', () => {
    fc.assert(fc.property(routes, (routes) => {
      const before = JSON.stringify(routes, (_, value) => typeof value === 'symbol' ? String(value) : value)
      serializeRoutes('Schema', routes)
      expect(JSON.stringify(routes, (_, value) => typeof value === 'symbol' ? String(value) : value)).toBe(before)
    }), params)
  })

  it('should represent every route segment in the output', () => {
    fc.assert(fc.property(routes, (routes) => {
      const output = serializeRoutes('Schema', routes)
      for (const route of routes) {
        for (const segment of route.segments) {
          if (typeof segment === 'symbol' || (typeof segment !== 'string' && segment.type !== 'static')) {
            continue
          }
          const value = typeof segment === 'string' ? segment : segment.value
          const key = value.includes('://') || value.startsWith('/') ? value : `/${value}`
          expect(output).toContain(JSON.stringify(key))
        }
      }
    }), params)
  })
})

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

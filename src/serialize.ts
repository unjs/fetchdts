import type { HTTPMethod } from './http'
import type { EndpointMetadata, RouteTree } from './tree'
import { DynamicParam, Endpoint, WildcardParam } from './tree'

interface OutputOptions {
  /** whether to export the generated interface */
  export?: boolean
}

/**
 * A single segment of a route.
 *
 * Static segments may be written with or without a leading slash (`'/users'`, `'users'`), or as an
 * origin (`'https://api.example.com'`). Parameters are either the exported symbols, for schemas
 * written by hand, or the plain object form, which survives serialisation across a tool boundary.
 */
export type RouteSegment
  = | string
    | typeof DynamicParam
    | typeof WildcardParam
    | { type: 'static', value: string }
    | { type: 'dynamic' }
    | { type: 'wildcard' }

export interface Route {
  /**
   * The route, already split into segments. `fetchdts` does not parse route patterns; convert them
   * with whichever tool owns them (see the readme).
   */
  segments: RouteSegment[]
  /**
   * Types for the endpoint, per method. `ALL` describes a handler registered for every method, as
   * a route with no method is in nitro and h3, and is emitted as a `Record` over `HTTPMethod` so
   * that it stays compact; a specific method takes precedence over it.
   */
  metadata?: {
    [key in HTTPMethod | 'ALL']?: Partial<Record<`${keyof EndpointMetadata}Type`, string>>
  }
  [key: string]: unknown
}

export function serializeRoutes(name: string, routes: Route[], options?: OutputOptions): string {
  const imports = new Set<string>()
  const tree: RouteTree = {}

  // build route tree
  for (const route of routes) {
    let node: RouteTree = tree
    for (const segment of route.segments) {
      const key = segmentKey(segment)
      if (typeof key === 'symbol') {
        imports.add(key === DynamicParam ? 'DynamicParam' : 'WildcardParam')
      }
      node[key] = node[key] || {}
      node = node[key] as RouteTree
    }

    // an endpoint with no methods would be offered as a valid path but resolve to `never`, so a
    // route with no method metadata contributes its segments and nothing else
    const methods = Object.entries(route.metadata || {})
      .filter((entry): entry is [string, Record<string, string>] => entry[1] !== undefined)
    if (methods.length === 0) {
      continue
    }

    imports.add('Endpoint')
    if (methods.some(([method]) => method === 'ALL')) {
      imports.add('HTTPMethod')
    }

    // distinct patterns can share a node, such as two parameters distinguished only by a constraint
    // the schema cannot express, so types are collected per field rather than overwritten
    const endpoints = (node[Endpoint] = (node[Endpoint] as RouteTree) || {}) as Record<string, Record<string, string[]>>
    for (const [method, metadata] of methods) {
      const existing = endpoints[method] = endpoints[method] || {}
      for (const [field, type] of Object.entries(metadata)) {
        if (type === undefined) {
          continue
        }
        const types = existing[field] = existing[field] || []
        if (!types.includes(type)) {
          types.push(type)
        }
      }
    }
  }

  // stringify resulting tree
  return [
    imports.size > 0 ? `import type { ${[...imports].sort().join(', ')} } from 'fetchdts'\n` : undefined,
    `${options?.export ? 'export ' : ''}interface ${name} {\n${stringifyRouteTree(tree)}}`,
  ].filter(s => s !== undefined).join('\n')
}

const symbols = [DynamicParam, WildcardParam, Endpoint] as const

const keys: Record<symbol | string, string> = {
  [DynamicParam]: '[DynamicParam]',
  [WildcardParam]: '[WildcardParam]',
  [Endpoint]: '[Endpoint]',
}

function stringifyRouteTree(tree: RouteTree, indent = 2, metadata = false): string {
  let properties = ''
  const entries = [
    ...Object.entries(tree),
    ...symbols.map(symbol => [symbol, tree[symbol]] as const),
  ]
  for (const [_key, value] of entries) {
    if (!value) {
      continue
    }
    // the `Type` suffix belongs to metadata fields (`responseType` -> `response`); a static
    // segment that happens to end in `Type` keeps its name
    const key = keys[_key] || JSON.stringify(metadata ? (_key as string).replace(/Type$/, '') : _key as string)
    if (_key === Endpoint) {
      properties += `${' '.repeat(indent)}${key}: ${stringifyEndpoints(value as Record<string, Record<string, string[]>>, indent)}\n`
    }
    else if (Array.isArray(value)) {
      // each type is parenthesised, as arbitrary type source may not be safe to union unbracketed
      const type = value.length > 1 ? value.map(t => `(${t})`).join(' | ') : value[0]
      properties += `${' '.repeat(indent)}${key}: ${type}\n`
    }
    else if (typeof value === 'string') {
      properties += `${' '.repeat(indent)}${key}: ${value}\n`
    }
    else {
      const str = stringifyRouteTree(value as RouteTree, indent + 2, metadata)
      properties += `${' '.repeat(indent)}${key}: {\n${str}${' '.repeat(indent)}}\n`
    }
  }

  return properties
}

/**
 * Stringifies the methods of one endpoint. An `ALL` entry becomes a `Record` over every method,
 * with any specific method excluded from it and intersected on, so that the specific entry wins.
 */
function stringifyEndpoints(endpoints: Record<string, Record<string, string[]>>, indent: number): string {
  const { ALL: all, ...methods } = endpoints
  const named = Object.keys(methods)

  const specific = named.length > 0
    ? `{\n${stringifyRouteTree(methods as unknown as RouteTree, indent + 2, true)}${' '.repeat(indent)}}`
    : undefined

  if (!all) {
    return specific || `{\n${' '.repeat(indent)}}`
  }

  const covered = named.length > 0
    ? `Exclude<HTTPMethod, ${named.map(method => JSON.stringify(method)).join(' | ')}>`
    : 'HTTPMethod'
  const record = `Record<${covered}, {\n${stringifyRouteTree(all as unknown as RouteTree, indent + 2, true)}${' '.repeat(indent)}}>`

  return specific ? `${record} & ${specific}` : record
}

function segmentKey(segment: RouteSegment): string | symbol {
  if (typeof segment === 'string') {
    return staticKey(segment)
  }
  if (typeof segment === 'symbol') {
    return segment
  }
  switch (segment.type) {
    case 'dynamic': return DynamicParam
    case 'wildcard': return WildcardParam
    case 'static': return staticKey(segment.value)
  }
}

function staticKey(value: string): string {
  // origins are matched as a single leading segment, so they keep their scheme instead of gaining a slash
  if (value.includes('://') || value.startsWith('/')) {
    return value
  }
  return `/${value}`
}

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
  metadata?: {
    [key in HTTPMethod]?: Partial<Record<`${keyof EndpointMetadata}Type`, string>>
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

    imports.add('Endpoint')

    node[Endpoint] = Object.assign((node[Endpoint] as RouteTree) || {}, route.metadata)
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

function stringifyRouteTree(tree: RouteTree, indent = 2): string {
  let properties = ''
  const entries = [
    ...Object.entries(tree),
    ...symbols.map(symbol => [symbol, tree[symbol]] as const),
  ]
  for (const [_key, value] of entries) {
    if (!value) {
      continue
    }
    const key = keys[_key] || JSON.stringify((_key as string).replace(/Type$/, ''))
    if (typeof value === 'string') {
      properties += `${' '.repeat(indent)}${key}: ${value}\n`
    }
    else {
      const str = stringifyRouteTree(value as RouteTree, indent + 2)
      properties += `${' '.repeat(indent)}${key}: {\n${str}${' '.repeat(indent)}}\n`
    }
  }

  return properties
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

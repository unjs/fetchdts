import type { HTTPMethod } from './fetch'
import type { EndpointMetadata, RouteTree } from './tree'
import { DynamicParam, WildcardParam } from './tree'

interface OutputOptions {
  /** whether to export the generated interface */
  export?: boolean
}

interface Route {
  type?: 'static' | 'dynamic' | 'wildcard'
  path: string
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
    const { segments } = parsePath(route.path)

    let node: RouteTree = tree
    for (const segment of segments) {
      node[segment] = node[segment] || {}
      node = node[segment] as RouteTree
    }

    if (route.type === 'dynamic') {
      imports.add('DynamicParam')

      node[DynamicParam] = node[DynamicParam] || {}
      node = node[DynamicParam] as RouteTree
    }
    if (route.type === 'wildcard') {
      imports.add('WildcardParam')

      node[WildcardParam] = node[WildcardParam] || {}
      node = node[WildcardParam] as RouteTree
    }

    Object.assign(node, route.metadata)
  }

  // stringify resulting tree
  return [
    imports.size > 0 ? `import { ${[...imports].join(', ')} } from 'fetchdts'` : undefined,
    options?.export ? 'export ' : undefined,
    '',
    `interface ${name} {\n${stringifyRouteTree(tree)}}`,
  ].filter(s => s !== undefined).join('\n')
}

const symbols = [DynamicParam, WildcardParam] as const

const keys: Record<symbol | string, string> = {
  [DynamicParam]: '[DynamicParam]',
  [WildcardParam]: '[WildcardParam]',
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
    const key = keys[_key] || JSON.stringify(_key)
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

function parsePath(path: string): { segments: string[] } {
  const url = new URL(path, 'http://localhost')
  const segments = url.pathname.split('/').map(s => s.replace(/^\/?/, '/'))
  if (segments[0] === '/' && segments.length > 1) {
    segments.shift()
  }

  segments[segments.length - 1] += url.search + url.hash

  if (!/^https?:\/\/localhost/.test(path) && url.host === 'localhost') {
    return { segments }
  }

  segments.unshift(url.origin)

  return { segments }
}

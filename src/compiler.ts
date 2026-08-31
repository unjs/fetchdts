import type { HTTPMethod } from './http'
import type { EndpointMetadata, RouteTree } from './tree'
import { DynamicParam, Endpoint, WildcardParam } from './tree'

/**
 * A single segment of a route.
 *
 * Static segments may be written with or without a leading slash (`'/users'`, `'users'`), or as an
 * origin (`'https://api.example.com'`). Parameters are either the exported symbols or the plain
 * object form, which survives serialisation across a tool boundary.
 *
 * A static segment spanning several path segments is split into one key per segment; an origin is
 * kept whole.
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
   * with whichever tool owns them.
   */
  segments: RouteSegment[]
  /**
   * Types for the endpoint, per method, as source. `ALL` describes a handler registered for every
   * method; a specific method takes precedence over it.
   */
  metadata?: {
    [key in HTTPMethod | 'ALL']?: Partial<Record<`${keyof EndpointMetadata}Type`, string>>
  }
}

/** A set of routes sharing an origin. Several sets compile into one module, as several roots. */
export interface RouteSet {
  routes: Route[]
  /** An origin the set is served from, for a schema describing an API on another host. */
  origin?: string
}

/**
 * How the compiler resolved a path in the emitted module.
 *
 * - `table`: an exact-match table for static paths, and the tree for the rest. No path union, so an
 *   editor offers no completions; chosen where a union would cost more than it is worth.
 * - `table+union`: as `table`, and the union of every path, emitted as source.
 * - `tree`, `tree+union`: no table, for a route set with too few static paths to be worth one.
 */
export type CompileStrategy = 'table' | 'table+union' | 'tree' | 'tree+union'

export interface CompileStats {
  routes: number
  static: number
  dynamic: number
  wildcard: number
}

export interface CompileOptions {
  /** The name of the emitted route tree interface. Defaults to `'Routes'`. */
  name?: string
  /**
   * The interface the emitted accessors resolve a path against. Defaults to `name`.
   *
   * A consumer whose route map can be extended by hand declares an interface extending the emitted
   * one and points the accessors at it, so a route added by augmentation is still found. The name
   * must be in scope in the emitted module; pass it through `imports`.
   */
  resolveAgainst?: string
  /**
   * Import statements to emit after the compiler's own, for a consumer whose metadata references
   * types it has to bring into scope. Emitting them here keeps the banner at the head of the file.
   */
  imports?: string[]
  /**
   * Where the emitted imports resolve to. Defaults to `'fetchdts'`.
   *
   * Pass the specifier the types are re-exported from where the consuming project does not depend on
   * `fetchdts` directly.
   */
  moduleSpecifier?: string
  /**
   * The number of paths reached through a parameter above which the path union is not emitted.
   * Defaults to 200.
   *
   * A parameter contributes a template literal member, which is related against every call site
   * where a literal member is found through a map, so the union's cost tracks this count.
   */
  unionLimit?: number
  /** Force a strategy, where the chosen one is wrong for a project. */
  strategy?: CompileStrategy
}

/**
 * Route keys, method names and metadata fields all come from user input, so every lookup table built
 * from them has a null prototype; otherwise a route segment or method named `toString` or
 * `constructor` would resolve to an inherited value.
 */
function dict<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>
}

const identifier = /^[$a-z_][\w$]*$/i

/** reserved words, and the words reserved in strict mode, as the emitted module is a module */
const reserved = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

/** the names the emitted module declares itself, which an interface it resolves against cannot take */
const emitted = new Set(['Exact', 'Path', 'ValidInput', 'Response', 'Methods', 'ResponseHeaders', 'ErrorBody', 'RequestBody', 'RequestQuery', 'RequestHeaders', 'Requires'])

/** Escapes a segment interpolated into an emitted template literal type. */
function templatePart(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

export interface CompiledRoutes {
  /** The emitted module. */
  code: string
  strategy: CompileStrategy
  stats: CompileStats
  /**
   * The names the emitted module imports from `moduleSpecifier`, for a consumer that re-exports them
   * from its own entry and wants to assert it covers this list.
   */
  imports: string[]
  toString: () => string
}

interface Leaf {
  /** the key chain from the root of the tree, for indexing into it */
  keys: Array<string | symbol>
  /** the path as requested, where every segment of it is static */
  path?: string
  kind: 'static' | 'dynamic' | 'wildcard'
}

/**
 * Compile route sets into a module of types specialised to them.
 *
 * Every strategy emits the same names, so a consumer's signatures do not depend on which was chosen.
 * A stale artefact fails to compile only where an imported name changed, so rename an emitted-surface
 * type whenever its meaning changes.
 */
export function compileRoutes(sets: RouteSet[], options?: CompileOptions): CompiledRoutes {
  const name = options?.name ?? 'Routes'
  if (!identifier.test(name) || reserved.has(name)) {
    throw new TypeError(`Cannot compile routes as \`${name}\`, which is not a valid interface name.`)
  }
  if (emitted.has(name)) {
    throw new TypeError(`Cannot compile routes as \`${name}\`, which the emitted module declares itself.`)
  }
  const target = options?.resolveAgainst ?? name
  if (!identifier.test(target) || reserved.has(target)) {
    throw new TypeError(`Cannot resolve paths against \`${target}\`, which is not a valid interface name.`)
  }
  if (emitted.has(target)) {
    throw new TypeError(`Cannot resolve paths against \`${target}\`, which the emitted module declares itself.`)
  }
  const specifier = options?.moduleSpecifier ?? 'fetchdts'
  // no module is named with a quote, a backslash or a newline, so they are rejected rather than escaped
  if (typeof specifier !== 'string' || /['"\\\n\r]/.test(specifier)) {
    throw new TypeError(`Cannot import from ${JSON.stringify(specifier)}, which is not a valid module specifier.`)
  }
  const imports = new Set<string>(['AnyHTTPMethod', 'TypedFetchErrorBody', 'TypedFetchMethods', 'TypedFetchRequestBody', 'TypedFetchRequestHeaders', 'TypedFetchRequestQuery', 'TypedFetchRequires', 'TypedFetchResponseBody', 'TypedFetchResponseHeaders', 'ValidFetchInput'])
  const tree: RouteTree = dict()
  const leaves: Leaf[] = []
  // a route set may repeat a route, and the counts a strategy is chosen by should not double
  const seen = dict<Leaf>()

  for (const set of sets) {
    for (const route of set.routes) {
      const keys: Array<string | symbol> = []
      if (set.origin !== undefined) {
        keys.push(...staticKeys(set.origin))
      }
      let kind: Leaf['kind'] = 'static'
      for (const segment of route.segments) {
        for (const key of segmentKeys(segment)) {
          // a wildcard consumes the remainder of a path, so nothing can follow it
          if (kind === 'wildcard') {
            throw new TypeError(`Cannot compile a route with a segment after a wildcard: ${JSON.stringify(route.segments.map(part => typeof part === 'symbol' ? part.description : part))}.`)
          }
          if (key === DynamicParam) {
            kind = 'dynamic'
            imports.add('DynamicParam')
          }
          else if (key === WildcardParam) {
            kind = 'wildcard'
            imports.add('WildcardParam')
          }
          keys.push(key)
        }
      }

      let node: RouteTree = tree
      for (const key of keys) {
        if (!Object.hasOwn(node, key)) {
          node[key] = dict()
        }
        node = node[key] as RouteTree
      }

      // a route with no methods would be offered as a path and resolve to `never`, so it contributes
      // its segments and nothing else. a method is compared case-insensitively, so a lowercase key
      // would be emitted as one no lookup could reach
      const methods = Object.entries(route.metadata || {})
        .filter((entry): entry is [string, Record<string, string>] => typeof entry[1] === 'object' && entry[1] !== null)
        .map(([method, metadata]) => [method.toUpperCase(), metadata] as const)
      if (methods.length === 0) {
        continue
      }

      imports.add('Endpoint')
      if (methods.some(([method]) => method === 'ALL')) {
        imports.add('HTTPMethod')
      }

      // distinct patterns can share a node, such as two parameters distinguished only by a constraint
      // the schema cannot express, so types are collected per field rather than overwritten
      const endpoints = (node[Endpoint] = (node[Endpoint] as RouteTree) || dict()) as Record<string, Record<string, string[]>>
      for (const [method, metadata] of methods) {
        const existing = endpoints[method] = Object.hasOwn(endpoints, method) ? endpoints[method]! : dict<string[]>()
        for (const [field, type] of Object.entries(metadata)) {
          if (typeof type !== 'string') {
            continue
          }
          const types = existing[field] = Object.hasOwn(existing, field) ? existing[field]! : []
          if (!types.includes(type)) {
            types.push(type)
          }
        }
      }

      const leaf: Leaf = {
        keys,
        kind,
        // a route with no segments is the root, which is requested as `/`
        path: kind === 'static' ? keys.join('') || '/' : undefined,
      }
      const id = `${kind}\u0000${keys.map(key => typeof key === 'symbol' ? key.description : key).join('\u0000')}`
      if (!Object.hasOwn(seen, id)) {
        seen[id] = leaf
        leaves.push(leaf)
      }
    }
  }

  const stats: CompileStats = {
    routes: leaves.length,
    static: leaves.filter(leaf => leaf.kind === 'static').length,
    dynamic: leaves.filter(leaf => leaf.kind === 'dynamic').length,
    wildcard: leaves.filter(leaf => leaf.kind === 'wildcard').length,
  }
  const strategy = options?.strategy ?? chooseStrategy(stats, options?.unionLimit ?? 200)
  const table = strategy.startsWith('table')
  const union = strategy.endsWith('union')
  if (!union) {
    imports.add('AnyFetchPath')
  }

  const body = stringifyRouteTree(tree).trimEnd()
  const code = [
    `// generated by fetchdts, strategy ${strategy}, ${stats.routes} route${stats.routes === 1 ? '' : 's'}`,
    `// (${stats.static} static, ${stats.dynamic} dynamic, ${stats.wildcard} wildcard)`,
    `import type { ${[...imports].sort().join(', ')} } from '${specifier}'`,
    ...options?.imports ?? [],
    '',
    ...body === '' ? [`export interface ${name} {}`] : [`export interface ${name} {`, body, '}'],
    '',
    ...table ? [exact(name, leaves), ''] : [],
    ...union ? [pathUnion(leaves), ''] : [`export type Path = AnyFetchPath`, ''],
    accessors(target, table),
  ].join('\n')

  return { code, strategy, stats, imports: [...imports].sort(), toString: () => code }
}

/**
 * A table is worth emitting for any static path, since it replaces a walk with a lookup; a union is
 * worth emitting while the paths reached through a parameter are few enough for it to stay cheap.
 */
function chooseStrategy(stats: CompileStats, unionLimit: number): CompileStrategy {
  const table = stats.static > 0
  const union = stats.dynamic + stats.wildcard <= unionLimit
  return `${table ? 'table' : 'tree'}${union ? '+union' : ''}` as CompileStrategy
}

/** The exact-match table, pointing into the tree rather than repeating its metadata. */
function exact(name: string, leaves: Leaf[]): string {
  const entries = new Set(leaves
    .filter((leaf): leaf is Leaf & { path: string } => leaf.path !== undefined)
    .map(leaf => `  ${JSON.stringify(leaf.path)}: ${name}${leaf.keys.map(key => `[${JSON.stringify(key as string)}]`).join('')}[typeof Endpoint]`))
  return [
    '/**',
    ' * Every path whose every segment is known, mapped to the endpoints registered on it.',
    ' *',
    ' * A fast path rather than the authority: a lookup that misses falls through to the tree, which',
    ' * costs nothing, since a path reached through a parameter has to walk either way.',
    ' */',
    'export interface Exact {',
    ...entries,
    '}',
  ].join('\n')
}

/** Every path, as source, so the union is resolved once rather than at every call site. */
function pathUnion(leaves: Leaf[]): string {
  const members = new Set<string>()
  for (const leaf of leaves) {
    for (const member of pathMembers(leaf)) {
      members.add(member)
    }
  }
  if (members.size === 0) {
    return 'export type Path = never'
  }
  return `export type Path =\n${[...members].map(member => `  | ${member}`).join('\n')}`
}

/** The forms one route takes as a path. A trailing wildcard contributes a second form without it. */
function pathMembers(leaf: Leaf): string[] {
  if (leaf.path !== undefined) {
    return [JSON.stringify(leaf.path)]
  }
  // `null` is a parameter, which takes at least one character
  const parts: Array<string | null> = []
  let wildcard = -1
  for (const key of leaf.keys) {
    if (key === DynamicParam) {
      parts.push(null)
    }
    else if (key === WildcardParam) {
      wildcard = parts.length
      parts.push(null)
    }
    else {
      parts.push(key as string)
    }
  }
  const members = [renderPath(parts)]
  if (wildcard !== -1) {
    members.push(renderPath(parts.filter((_, index) => index !== wildcard)))
  }
  return members
}

/** a parameter, as a template literal placeholder taking at least one character */
// eslint-disable-next-line no-template-curly-in-string
const placeholder = '/${string}${string}'

function renderPath(parts: Array<string | null>): string {
  if (parts.every(part => part !== null)) {
    // a wildcard at the root consumes the whole path, so the form without it is the root itself
    return JSON.stringify(parts.join('') || '/')
  }
  return `\`${parts.map(part => part === null ? placeholder : templatePart(part)).join('')}\``
}

/** The accessors a consumer builds its signatures from. */
function accessors(name: string, table: boolean): string {
  const viaTable = (hit: string, miss: string) => table
    ? `Path_ extends keyof Exact\n    ? Uppercase<Method> extends keyof Exact[Path_]\n      ? ${hit}\n      : ${miss}\n    : ${miss}`
    : miss

  return [
    '/**',
    ' * Whether a path resolves, for use in parameter position: `input: T & ValidInput<T, M>`.',
    ' *',
    ' * Does not consult `Exact`: a lookup where the path is still a type parameter relates a `keyof`',
    ' * of every static path once per program, so the table stays where the path is resolved.',
    ' */',
    `export type ValidInput<Path_, Method extends AnyHTTPMethod = 'GET'>`,
    `  = ValidFetchInput<${name}, Path_, Method>`,
    '',
    `export type Response<Path_, Method extends AnyHTTPMethod = 'GET'>`,
    `  = ${viaTable(
      `'response' extends keyof Exact[Path_][Uppercase<Method>]\n        ? Exact[Path_][Uppercase<Method>]['response']\n        : unknown`,
      `TypedFetchResponseBody<${name}, Path_, Method>`,
    )}`,
    '',
    `export type Methods<Path_> = TypedFetchMethods<${name}, Path_>`,
    '',
    `export type ResponseHeaders<Path_, Method extends AnyHTTPMethod = 'GET'> = TypedFetchResponseHeaders<${name}, Path_, Method>`,
    '',
    `export type ErrorBody<Path_, Method extends AnyHTTPMethod = 'GET'> = TypedFetchErrorBody<${name}, Path_, Method>`,
    '',
    `export type RequestBody<Path_, Method extends AnyHTTPMethod = 'GET', Fallback = BodyInit | null> = TypedFetchRequestBody<${name}, Path_, Method, Fallback>`,
    '',
    `export type RequestQuery<Path_, Method extends AnyHTTPMethod = 'GET', Fallback = Record<string, unknown>> = TypedFetchRequestQuery<${name}, Path_, Method, Fallback>`,
    '',
    `export type RequestHeaders<Path_, Method extends AnyHTTPMethod = 'GET', Fallback = HeadersInit> = TypedFetchRequestHeaders<${name}, Path_, Method, Fallback>`,
    '',
    `export type Requires<Path_, Method extends AnyHTTPMethod, Field extends 'body' | 'query' | 'headers'> = TypedFetchRequires<${name}, Path_, Method, Field>`,
  ].join('\n')
}

const symbols = [DynamicParam, WildcardParam, Endpoint] as const

const symbolNames: Record<symbol | string, string> = Object.assign(dict<string>(), {
  [DynamicParam]: '[DynamicParam]',
  [WildcardParam]: '[WildcardParam]',
  [Endpoint]: '[Endpoint]',
})

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
    const key = symbolNames[_key] || JSON.stringify(metadata ? (_key as string).replace(/Type$/, '') : _key as string)
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

function segmentKeys(segment: RouteSegment): Array<string | symbol> {
  if (typeof segment === 'string') {
    return staticKeys(segment)
  }
  if (typeof segment === 'symbol') {
    return [segment]
  }
  switch (segment?.type) {
    case 'dynamic': return [DynamicParam]
    case 'wildcard': return [WildcardParam]
    case 'static': return staticKeys(segment.value)
    default: throw new TypeError(`Unknown route segment: ${JSON.stringify(segment)}.`)
  }
}

/**
 * A static segment as one key per path segment, which is what a path is resolved by. An origin is one
 * key, including its scheme, as it is matched as a single leading key.
 */
function staticKeys(value: string): string[] {
  if (typeof value !== 'string') {
    throw new TypeError(`Static route segments must be strings, received ${JSON.stringify(value)}.`)
  }
  const origin = value.match(/^[a-z][a-z\d+\-.]*:\/\/[^/]*/i)?.[0]
  const path = origin ? value.slice(origin.length) : value
  const segments = path.split('/').filter(segment => segment !== '').map(segment => `/${segment}`)
  return origin ? [origin, ...segments] : segments
}

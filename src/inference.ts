import type { HTTPMethod } from './http'
import type { DynamicParam, Endpoint, StaticParam, WildcardParam } from './tree'
import type { RespectOptionality } from './utils'

// TODO: support TypedFetchURL<Schema, T> | TypedFetchRequest<Schema, T>
export type TypedFetchInput<Schema, Method extends HTTPMethod | '' = ''> = TypedFetchPath<Schema, '', Method>

export type TypedFetchPath<Schema, Base extends string = '', Method = ''> = {
  [K in keyof Schema]: K extends typeof Endpoint
    ? '' extends Method
      ? Base // return all possible endpoints
      : Method extends keyof Schema[K]
        ? Base // filter by method passed in
        : never
    : K extends StaticParam
      ? Schema[K] extends Record<string | symbol, unknown>
        ? TypedFetchPath<Schema[K], `${Base}${K}`, Method>
        : never
      : K extends typeof DynamicParam
        ? Schema[K] extends Record<string | symbol, unknown>
          ? TypedFetchPath<Schema[K], `${Base}/${string}${string}`, Method>
          : never
        : K extends typeof WildcardParam
          ? Schema[K] extends Record<string | symbol, unknown>
            ? TypedFetchPath<Schema[K], `${Base}/${string}${string}`, Method>
            : never
          : never
}[keyof Schema]

/**
 * Metadata for the endpoint `Path` resolves to, including endpoints reached through a dynamic or
 * wildcard parameter. This is the lookup a router performs; {@link TypedFetchMeta} on its own
 * considers static segments only.
 */
export type TypedFetchResolvedMeta<Schema, Path, Method extends HTTPMethod | '' = ''>
  = TypedFetchMeta<Schema, Path, Method, 'dynamic'>

// TODO: optimise me
type RequestInitFor<Meta> = {
  [K in keyof Omit<RequestInit, 'method' | 'body'>]?: K extends keyof Meta
    ? Meta[K]
    : RequestInit[K]
} & (
  'method' extends keyof Meta
    // if GET is a valid method we don't require method to be specified
    ? 'GET' extends Meta['method']
      ? { method?: Meta['method'] }
      : { method: Meta['method'] }
    : { method?: RequestInit['method'] }
) & RespectOptionality<Meta, 'body', RequestInit['body']>

export type TypedFetchRequestInit<Schema, T> = RequestInitFor<TypedFetchResolvedMeta<Schema, T>>

/**
 * How a path is matched against a schema.
 *
 * - `exact`: static segments only.
 * - `dynamic`: parameters are considered where no static segment matches.
 * - `ambiguous`: as `dynamic`, but a parameter has consumed a segment that is not a literal, so the
 *   request could also have matched a static sibling and {@link EndpointMetadata.ambiguousResponse}
 *   is preferred where an endpoint declares one.
 */
export type MatchPattern = 'exact' | 'dynamic' | 'ambiguous'

/** Endpoints reached by matching `Path` against the static keys of `Schema`. */
type StaticMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern> = {
  [K in keyof Schema]: K extends StaticParam
    ? Path extends `${K}${infer Rest}`
      ? TypedFetchMeta<Schema[K], Rest, Method, Pattern>
      : never
    : never
}[keyof Schema]

/** Endpoints reached by consuming a segment of `Path` with a dynamic or wildcard parameter. */
type ParamMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern> = {
  [K in keyof Schema]: K extends typeof DynamicParam
    ? TypedFetchMeta<Schema[K], AfterSegment<Path>, Method, LiteralSegment<Path> extends false ? 'ambiguous' : Pattern>
    : K extends typeof WildcardParam
      ? [NonEmptySegments<Path>] extends [never]
          ? never
          : TypedFetchMeta<Schema[K], '', Method, Pattern>
      : never
}[keyof Schema]

/**
 * Metadata for the endpoints registered directly on a node, narrowed by `Method`
 * when one is provided.
 */
type EndpointMeta<Endpoints, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = '' extends Method
    ? { [M in keyof Endpoints]: { method: M } & Ambiguate<Endpoints[M], Pattern> }[keyof Endpoints]
    : Method extends keyof Endpoints
      ? Ambiguate<Endpoints[Method], Pattern> & { method: Method }
      : never

/**
 * Replaces `response` with `ambiguousResponse` where the walk reached the endpoint through a
 * parameter that consumed a segment known only at runtime, and the endpoint declares one. Endpoints
 * without an `ambiguousResponse` are returned untouched, so this is inert until one is emitted.
 */
type Ambiguate<Metadata, Pattern extends MatchPattern>
  = Pattern extends 'ambiguous'
    ? 'ambiguousResponse' extends keyof Metadata
      ? { [K in Exclude<keyof Metadata, 'ambiguousResponse'>]: K extends 'response' ? Metadata['ambiguousResponse'] : Metadata[K] }
      : Metadata
    : Metadata

/** Whether the segment `Path` is about to consume is a literal rather than `string`-like. */
type LiteralSegment<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? string extends Head ? false : true
      : string extends Rest ? false : true
    : true

/** `Path` itself if it contains at least one non-empty segment, otherwise `never`. */
type NonEmptySegments<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends ''
      ? never
      : Path
    : never

/** The remainder of `Path` after consuming a single non-empty segment. */
type AfterSegment<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? Head extends ''
        ? never
        : Path extends `/${Head}${infer Tail}`
          ? Tail
          : never
      : Rest extends ''
        ? never
        : ''
    : never

export type TypedFetchMeta<Schema, Path, Method extends HTTPMethod | '' = '', Pattern extends MatchPattern = 'exact'>
  = Path extends ''
    ? typeof Endpoint extends keyof Schema
      ? EndpointMeta<Schema[typeof Endpoint], Method, Pattern>
      : never
    : Path extends string
      ? Pattern extends 'dynamic' | 'ambiguous'
        ? [StaticMatch<Schema, Path, Method, Pattern>] extends [never]
            ? ParamMatch<Schema, Path, Method, Pattern>
            : StaticMatch<Schema, Path, Method, Pattern>
        : StaticMatch<Schema, Path, Method, Pattern>
      : never

export type TypedFetchResponseBody<Schema, Endpoint, Method extends HTTPMethod = 'GET'>
  = 'response' extends keyof TypedFetchResolvedMeta<Schema, Endpoint, Method>
    ? TypedFetchResolvedMeta<Schema, Endpoint, Method>['response']
    : never

export type TypedFetchResponseHeaders<Schema, Endpoint, Method extends HTTPMethod = 'GET'>
  = 'responseHeaders' extends keyof TypedFetchResolvedMeta<Schema, Endpoint, Method>
    ? TypedFetchResolvedMeta<Schema, Endpoint, Method>['responseHeaders']
    : never

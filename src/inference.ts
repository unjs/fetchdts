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

// TODO: optimise me
export type TypedFetchRequestInit<Schema, T> = {
  [K in keyof Omit<RequestInit, 'method' | 'body'>]?: K extends keyof TypedFetchMeta<Schema, T>
    ? TypedFetchMeta<Schema, T>[K]
    : RequestInit[K]
} & (
  'method' extends keyof TypedFetchMeta<Schema, T>
    // if GET is a valid method we don't require method to be specified
    ? 'GET' extends TypedFetchMeta<Schema, T>['method']
      ? { method?: TypedFetchMeta<Schema, T>['method'] }
      : { method: TypedFetchMeta<Schema, T>['method'] }
    : { method?: RequestInit['method'] }
) & RespectOptionality<TypedFetchMeta<Schema, T>, 'body', RequestInit['body']>

/**
 * Metadata for the endpoints registered directly on a node, narrowed by `Method`
 * when one is provided.
 */
type EndpointMeta<Endpoints, Method extends HTTPMethod | ''>
  = '' extends Method
    ? { [M in keyof Endpoints]: { method: M } & Endpoints[M] }[keyof Endpoints]
    : Method extends keyof Endpoints
      ? Endpoints[Method] & { method: Method }
      : never

/** `Path` itself if it contains at least one non-empty segment, otherwise `never`. */
type NonEmptySegments<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends ''
      ? never
      : Path
    : Path

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

export type TypedFetchMeta<Schema, Path, Method extends HTTPMethod | '' = '', Pattern extends 'exact' | 'dynamic' = 'exact'>
  = Path extends ''
    ? typeof Endpoint extends keyof Schema
      ? EndpointMeta<Schema[typeof Endpoint], Method>
      : never
    : Path extends string
      ? {
          [K in keyof Schema]: K extends StaticParam
            ? Path extends `${K}${infer Rest}`
              ? TypedFetchMeta<Schema[K], Rest, Method, Pattern>
              : never
            : Pattern extends 'dynamic'
              ? K extends typeof DynamicParam
                ? TypedFetchMeta<Schema[K], AfterSegment<Path>, Method, Pattern>
                : K extends typeof WildcardParam
                  ? NonEmptySegments<Path> extends never
                    ? never
                    : TypedFetchMeta<Schema[K], '', Method, Pattern>
                  : never
              : never
        }[keyof Schema]
      : never

export type TypedFetchResponseBody<Schema, Endpoint, Method extends HTTPMethod = 'GET'>
  = TypedFetchMeta<Schema, Endpoint, Method> extends never
    ? 'response' extends keyof TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>
      ? TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>['response']
      : never
    : 'response' extends keyof TypedFetchMeta<Schema, Endpoint, Method>
      ? TypedFetchMeta<Schema, Endpoint, Method>['response']
      : never

export type TypedFetchResponseHeaders<Schema, Endpoint, Method extends HTTPMethod = 'GET'>
  = TypedFetchMeta<Schema, Endpoint, Method> extends never
    ? 'responseHeaders' extends keyof TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>
      ? TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>['responseHeaders']
      : never
    : 'responseHeaders' extends keyof TypedFetchMeta<Schema, Endpoint, Method>
      ? TypedFetchMeta<Schema, Endpoint, Method>['responseHeaders']
      : never

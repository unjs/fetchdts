import type { HTTPMethod } from './fetch'
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

export type TypedFetchMeta<Schema, Path, Method extends HTTPMethod | '' = '', Pattern extends 'exact' | 'dynamic' = 'exact'> = {
  [K in keyof Schema]: K extends typeof Endpoint
    ? '' extends Method
      ? { [M in keyof Schema[K]]: { method: M } & Schema[K][M] }[keyof Schema[K]]
      : Method extends keyof Schema[K]
        ? Schema[K][Method] & { method: Method }
        : never
    : Path extends K
      ? TypedFetchMeta<Schema[K], Path, Method, Pattern>
      : K extends StaticParam
        ? Path extends `${K}${infer Rest}`
          ? Rest extends keyof Schema[K]
            ? Pattern extends 'dynamic'
              ? typeof DynamicParam extends keyof Schema[K]
                ? Path extends `${string}${string}/${infer Additional}`
                  ? TypedFetchMeta<Schema[K][typeof DynamicParam], Additional, Method, Pattern> | TypedFetchMeta<Schema[K][Rest], Rest, Method, Pattern>
                  : never
                : typeof WildcardParam extends keyof Schema[K]
                  ? TypedFetchMeta<Schema[K][typeof WildcardParam], '', Method, Pattern> | TypedFetchMeta<Schema[K][Rest], Rest, Method, Pattern>
                  : never
              : TypedFetchMeta<Schema[K][Rest], Rest, Method, Pattern>
            : typeof DynamicParam extends keyof Schema[K]
              ? Path extends `${string}${string}/${infer Rest}`
                ? TypedFetchMeta<Schema[K][typeof DynamicParam], Rest, Method, Pattern>
                : never
              : typeof WildcardParam extends keyof Schema[K]
                ? TypedFetchMeta<Schema[K][typeof WildcardParam], '', Method, Pattern>
                : never
          : never
        : never
}[keyof Schema]

export type TypedFetchResponse<Schema, Endpoint, Method extends HTTPMethod = 'GET'> =
  TypedFetchMeta<Schema, Endpoint, Method> extends never
    ? 'response' extends keyof TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>
      ? TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>['response']
      : never
    : 'response' extends keyof TypedFetchMeta<Schema, Endpoint, Method>
      ? TypedFetchMeta<Schema, Endpoint, Method>['response']
      : never

export type TypedFetchResponseHeaders<Schema, Endpoint, Method extends HTTPMethod = 'GET'> =
  TypedFetchMeta<Schema, Endpoint, Method> extends never
    ? 'responseHeaders' extends keyof TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>
      ? TypedFetchMeta<Schema, Endpoint, Method, 'dynamic'>['responseHeaders']
      : never
    : 'responseHeaders' extends keyof TypedFetchMeta<Schema, Endpoint, Method>
      ? TypedFetchMeta<Schema, Endpoint, Method>['responseHeaders']
      : never

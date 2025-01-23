// this is an example native fetch client with full typings

// import type { HTTPMethod, TypedResponse } from './fetch'
// import type { RouteTree, TypedFetchInput, TypedFetchRequestInit, TypedFetchResponse } from './inference'

// export interface TypedFetch<Schema extends RouteTree> {
//   <T extends TypedFetchInput<Schema>, Init extends TypedFetchRequestInit<Schema, T>>(input: T, init: Init): Promise<TypedResponse<TypedFetchResponse<Schema, T, 'method' extends keyof Init ? Init['method'] extends HTTPMethod ? Init['method'] : 'GET' : 'GET'>>>
//   <T extends TypedFetchInput<Schema, 'GET'>, Init extends TypedFetchRequestInit<Schema, T>>(input: T, init?: Init): Promise<TypedResponse<TypedFetchResponse<Schema, T, 'GET'>>>
//   /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/fetch) */
// }

// export function createFetch<Schema extends RouteTree>() {
//   return fetch as unknown as TypedFetch<Schema>
// }

export type RespectOptionality<T, Key extends string, Fallback> = (
  Key extends keyof T
    ? T[Key] extends NonNullable<T[Key]>
      ? { [K in Key]-?: T[Key] }
      : { [K in Key]?: T[Key] }
    : { [K in Key]?: Fallback }
)

type WithoutQuery<T extends string> = T extends `${infer U}?${string}` ? U : T
type WithoutHash<T extends string> = T extends `${infer U}#${string}` ? U : T
type WithoutQueryOrHash<T extends string> = WithoutQuery<WithoutHash<T>>
type WithoutTrailingSlash<T extends string> = T extends `${infer U}/` ? U : T

export type Trimmed<T extends string> = WithoutTrailingSlash<WithoutQueryOrHash<T>>

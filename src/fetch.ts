import type { RequestHeaderMap, ResponseHeaderMap } from './http'

type TypedHeaderName<TypedHeaderValues> = Extract<keyof TypedHeaderValues, string> | string & {}

type TypedHeaderValue<TypedHeaderValues, Name extends string> = Lowercase<Name> extends keyof TypedHeaderValues ? Extract<TypedHeaderValues[Lowercase<Name>], string> : string

export interface TypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> extends Omit<Headers, 'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends TypedHeaderName<TypedHeaderValues>> (name: Name, value: TypedHeaderValue<TypedHeaderValues, Name>) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends TypedHeaderName<TypedHeaderValues>> (name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends TypedHeaderName<TypedHeaderValues>> (name: Name) => TypedHeaderValue<TypedHeaderValues, Name> | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends TypedHeaderName<TypedHeaderValues>> (name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends TypedHeaderName<TypedHeaderValues>> (name: Name, value: TypedHeaderValue<TypedHeaderValues, Name>) => void
  forEach: (callbackfn: (value: Extract<TypedHeaderValues[keyof TypedHeaderValues], string> | string & {}, key: TypedHeaderName<TypedHeaderValues>, parent: TypedHeaders<TypedHeaderValues>) => void, thisArg?: any) => void
}

/**
 * A variant of {@link TypedHeaders} that types header *names* but leaves every value as `string`.
 *
 * Use this when the header map is not known at the point of declaration, for example when it comes
 * from a generic parameter of your own type. `TypedHeaders` resolves each value with a conditional
 * lookup into the map, which TypeScript cannot reduce while the map is unresolved, so a plain
 * `Headers` is neither assignable to nor from `TypedHeaders<M>` for a generic `M`.
 */
export interface LooseTypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> extends Omit<Headers, 'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: (name: TypedHeaderName<TypedHeaderValues>, value: string) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: (name: TypedHeaderName<TypedHeaderValues>) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: (name: TypedHeaderName<TypedHeaderValues>) => string | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: (name: TypedHeaderName<TypedHeaderValues>) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: (name: TypedHeaderName<TypedHeaderValues>, value: string) => void
  forEach: (callbackfn: (value: string, key: TypedHeaderName<TypedHeaderValues>, parent: LooseTypedHeaders<TypedHeaderValues>) => void, thisArg?: any) => void
}

// type TypedHeaderTuples<TypedHeaderValues extends Record<string, string>> = {
//   [Name in Lowercase<Extract<keyof TypedHeaderValues, string>>]: [Name, Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string]
// }[Lowercase<Extract<keyof TypedHeaderValues, string>>][]

// type TypedHeadersInit<TypedHeaderValues extends Record<string, string>> = TypedHeaderTuples<TypedHeaderValues> | Partial<TypedHeaderValues> | TypedHeaders<TypedHeaderValues> | Headers

// type TypedHeadersClass<TypedHeaderValues extends Record<string, string>> = new (init?: TypedHeadersInit<TypedHeaderValues>) => TypedHeaders<TypedHeaderValues>

export interface TypedResponse<Body = unknown, Headers extends Record<string, string> | unknown = ResponseHeaderMap> extends Omit<Response, 'clone' | 'headers' | 'json'> {
  clone: () => TypedResponse<Body, Headers>
  json: () => Promise<Body>
  headers: TypedHeaders<Headers>
}

export interface TypedRequest<Body = unknown, Headers extends Record<string, string> | unknown = RequestHeaderMap> extends Omit<Request, 'clone' | 'headers' | 'json'> {
  clone: () => TypedRequest<Body, Headers>
  json: () => Promise<Body>
  headers: TypedHeaders<Headers>
}

/**
 * A variant of {@link TypedRequest} whose headers are {@link LooseTypedHeaders}, for use where the
 * header map comes from a generic parameter rather than being known up front.
 */
export interface LooseTypedRequest<Body = unknown, Headers extends Record<string, string> | unknown = RequestHeaderMap> extends Omit<Request, 'clone' | 'headers' | 'json'> {
  clone: () => LooseTypedRequest<Body, Headers>
  json: () => Promise<Body>
  headers: LooseTypedHeaders<Headers>
}

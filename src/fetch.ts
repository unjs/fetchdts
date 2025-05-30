import type { ResponseHeaderMap } from './http'

export interface TypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> extends Omit<Headers, 'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => (Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  forEach: (callbackfn: (value: TypedHeaderValues[keyof TypedHeaderValues] | string & {}, key: Extract<keyof TypedHeaderValues, string> | string & {}, parent: TypedHeaders<TypedHeaderValues>) => void, thisArg?: any) => void
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

export interface TypedRequest<Body = unknown, Headers extends Record<string, string> | unknown = ResponseHeaderMap> extends Omit<Request, 'clone' | 'headers' | 'json'> {
  clone: () => TypedRequest<Headers>
  json: () => Promise<Body>
  headers: TypedHeaders<Headers>
}

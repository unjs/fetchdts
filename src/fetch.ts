export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'CONNECT' | 'TRACE'

// TODO: 'typed' variants of headers
export interface TypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends string = keyof TypedHeaderValues & string> (name: Name, value: Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends string = keyof TypedHeaderValues & string> (name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends string = keyof TypedHeaderValues & string> (name: Name) => (Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string) | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends string = keyof TypedHeaderValues & string> (name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends string = keyof TypedHeaderValues & string> (name: Name, value: Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string) => void
  forEach: (callbackfn: <Name extends string = keyof TypedHeaderValues & string>(value: Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string, key: Name, parent: Headers) => void, thisArg?: any) => void
}

// type TypedHeaderTuples<TypedHeaderValues extends Record<string, string>> = {
//   [Name in Lowercase<keyof TypedHeaderValues & string>]: [Name, Name extends string ? Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string : string]
// }[Lowercase<keyof TypedHeaderValues & string>][]

// type TypedHeadersInit<TypedHeaderValues extends Record<string, string>> = TypedHeaderTuples<TypedHeaderValues> | Partial<TypedHeaderValues> | TypedHeaders<TypedHeaderValues> | Headers

// type TypedHeadersClass<TypedHeaderValues extends Record<string, string>> = new (init?: TypedHeadersInit<TypedHeaderValues>) => TypedHeaders<TypedHeaderValues>

export interface TypedResponse<Body = unknown, Headers extends Record<string, string> | unknown = Record<string, string>> extends Omit<Response, 'json' | 'headers'> {
  json: () => Promise<Body>
  headers: TypedHeaders<Headers>
}

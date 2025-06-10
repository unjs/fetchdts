export interface TypedURLSearchParams<QueryMap extends Record<string, string> | unknown = Partial<Record<string, string>>> extends Omit<URLSearchParams, 'append' | 'delete' | 'get' | 'getAll' | 'has' | 'set' | 'forEach'> {
  /**
   * Appends a specified key/value pair as a new search parameter.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/append)
   */
  append: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name, value: Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string) => void
  /**
   * Deletes the given search parameter, and its associated value, from the list of all search parameters.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/delete)
   */
  delete: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name, value?: Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string) => void
  /**
   * Returns the first value associated to the given search parameter.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/get)
   */
  get: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name) => (Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string) | null
  /**
   * Returns all the values association with a given search parameter.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/getAll)
   */
  getAll: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name) => Array<Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string>
  /**
   * Returns a Boolean indicating if such a search parameter exists.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/has)
   */
  has: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name, value?: Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string) => boolean
  /**
   * Sets the value associated to a given search parameter to the given value. If there were several values, delete the others.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/URLSearchParams/set)
   */
  set: <Name extends Extract<keyof QueryMap, string> | string & {}> (name: Name, value: Name extends keyof QueryMap ? QueryMap[Name] extends string ? QueryMap[Name] : string : string) => void
  forEach: (callbackfn: (value: QueryMap[keyof QueryMap] | string & {}, key: Extract<keyof QueryMap, string> | string & {}, parent: URLSearchParams) => void, thisArg?: any) => void
}

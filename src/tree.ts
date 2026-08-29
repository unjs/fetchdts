import type { HTTPMethod } from './http'

export type StaticParam = string // for readability only
export const DynamicParam: unique symbol = Symbol.for('dynamic parameter') as never
export const WildcardParam: unique symbol = Symbol.for('wildcard parameter') as never
export const Endpoint: unique symbol = Symbol.for('endpoints') as never

export interface RouteTree {
  [key: string | symbol]: Partial<Endpoints> | RouteTree
}

export interface EndpointMetadata {
  query: never | Record<string, unknown>
  headers: Record<string, unknown>
  body: never | Record<string, unknown>
  response: unknown
  /**
   * The response where the request could have matched a static sibling of the parameter it was
   * resolved through, because the segment was known only at runtime. Typically a union of this
   * endpoint's response and those of the siblings; see the readme.
   */
  ambiguousResponse: unknown
  responseHeaders: Record<string, unknown>
}

export type Endpoints = Record<HTTPMethod, EndpointMetadata>

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
  responseHeaders: Record<string, unknown>
}

export type Endpoints = Record<HTTPMethod, EndpointMetadata>

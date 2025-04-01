import type { HTTPMethod } from './fetch'

export type StaticParam = string // for readability only
export const DynamicParam = Symbol.for('dynamic parameter')
export const WildcardParam = Symbol.for('wildcard parameter')
export const Endpoint = Symbol.for('endpoints')

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

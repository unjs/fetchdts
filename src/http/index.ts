export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'CONNECT' | 'TRACE'

export type { RequestHeaderMap, RequestHeaderName } from './headers/request'
export type { ResponseHeaderMap, ResponseHeaderName } from './headers/response'

export type { MimeType } from './mimes'

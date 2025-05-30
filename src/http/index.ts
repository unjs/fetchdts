import type { TypedHeaders } from '../fetch'
import type { RequestHeaderMap } from './headers/request'
import type { ResponseHeaderMap } from './headers/response'

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'CONNECT' | 'TRACE'

export type { RequestHeaderMap, RequestHeaderName } from './headers/request'
export type { ResponseHeaderMap, ResponseHeaderName } from './headers/response'

export type { MimeType } from './mimes'

export type RequestHeaders = TypedHeaders<RequestHeaderMap>
export type ResponseHeaders = TypedHeaders<ResponseHeaderMap>

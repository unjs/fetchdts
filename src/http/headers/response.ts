import type { HTTPMethod } from '..'

type AnyString = string & {}

export type ResponseHeaderName = keyof ResponseHeaderMap | AnyString

export interface ResponseHeaderMap {
  'Accept-Patch': AnyString
  'Accept-Ranges': 'bytes' | 'none' | AnyString
  'Access-Control-Allow-Credentials': 'true' | AnyString
  'Access-Control-Allow-Headers': '*' | ResponseHeaderName | AnyString
  'Access-Control-Allow-Methods': '*' | HTTPMethod | AnyString
  'Access-Control-Allow-Origin': '*' | 'null' | AnyString
  'Access-Control-Expose-Headers': '*' | ResponseHeaderName | AnyString
  'Access-Control-Max-Age': AnyString
  'Age': AnyString
  'Allow': HTTPMethod | AnyString
  'Alt-Svc': AnyString
  'Alt-Used': AnyString
  'Cache-Control':
    | 'no-cache'
    | 'no-store'
    | 'max-age'
    | 'must-revalidate'
    | 'public'
    | 'private'
    | 'proxy-revalidate'
    | 's-maxage'
    | 'stale-while-revalidate'
    | 'stale-if-error'
    | AnyString
  'Clear-Site-Data': AnyString
  'Connection': 'keep-alive' | 'close' | AnyString
  'Content-Disposition': AnyString
  'Content-DPR': AnyString
  'Content-Encoding':
    | 'gzip'
    | 'compress'
    | 'deflate'
    | 'br'
    | 'identity'
    | AnyString
  'Content-Language': AnyString
  'Content-Length': AnyString
  'Content-Location': AnyString
  'Content-Range': AnyString
  'Content-Security-Policy': AnyString
  'Content-Security-Policy-Report-Only': AnyString
  'Content-Type': MimeType | AnyString
  'Cross-Origin-Embedder-Policy':
    | 'unsafe-none'
    | 'require-corp'
    | 'credentialless'
    | AnyString
  'Cross-Origin-Opener-Policy':
    | 'unsafe-none'
    | 'same-origin-allow-popups'
    | 'same-origin'
    | AnyString
  'Cross-Origin-Resource-Policy':
    | 'same-site'
    | 'same-origin'
    | 'cross-origin'
    | AnyString
  'Date': AnyString
  'Device-Memory': AnyString
  'Digest': AnyString
  'Downlink': AnyString
  'ECT': 'slow-2g' | '2g' | '3g' | '4g' | AnyString
  'ETag': AnyString
  'Early-Data': '1' | AnyString
  'Expect-CT': AnyString
  'Expires': AnyString
  'Feature-Policy': AnyString
  'Last-Event-ID': AnyString
  'Last-Modified': AnyString
  'Link': AnyString
  'Location': AnyString
  'NEL': AnyString
  'Origin-Agent-Cluster': AnyString
  'Origin-Isolation': AnyString
  'Proxy-Authenticate': AnyString
  'Public-Key-Pins': AnyString
  'Public-Key-Pins-Report-Only': AnyString
  'Refresh': AnyString
  'Report-To': AnyString
  'Retry-After': AnyString
  'Save-Data': AnyString
  'Sec-WebSocket-Accept': AnyString
  'Sec-WebSocket-Extensions': AnyString
  'Sec-WebSocket-Protocol': AnyString
  'Sec-WebSocket-Version': AnyString
  'Server': AnyString
  'Server-Timing': AnyString
  'Service-Worker-Allowed': AnyString
  'Service-Worker-Navigation-Preload': AnyString
  'Set-Cookie': AnyString
  'Signature': AnyString
  'Signed-Headers': AnyString
  'Sourcemap': AnyString
  'Strict-Transport-Security': AnyString
  'Timing-Allow-Origin': AnyString
  'Tk': AnyString
  'Vary': AnyString
  'Via': AnyString
  'WWW-Authenticate': AnyString
  'X-Content-Type-Options': 'nosniff' | AnyString
  'X-DNS-Prefetch-Control': 'on' | 'off' | AnyString
  'X-Frame-Options': 'DENY' | 'SAMEORIGIN' | AnyString
  'X-Permitted-Cross-Domain-Policies':
    | 'none'
    | 'master-only'
    | 'by-content-type'
    | 'all'
    | AnyString
  'X-Powered-By': AnyString
  'X-Robots-Tag': AnyString
  'X-UA-Compatible': 'IE=edge' | AnyString
  'X-XSS-Protection': '0' | '1' | '1; mode=block' | AnyString
}

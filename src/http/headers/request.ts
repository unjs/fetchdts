import type { HTTPMethod } from '..'
import type { MimeType } from '../mimes'

type AnyString = string & {}

export type RequestHeaderName = keyof RequestHeaderMap | AnyString

export interface RequestHeaderMap {
  'Accept': MimeType | AnyString
  'Accept-Charset': AnyString
  'Accept-Encoding':
    | 'gzip'
    | 'compress'
    | 'deflate'
    | 'br'
    | 'identity'
    | AnyString
  'Accept-Language': AnyString
  'Accept-Ch':
    | 'Sec-CH-UA'
    | 'Sec-CH-UA-Arch'
    | 'Sec-CH-UA-Bitness'
    | 'Sec-CH-UA-Full-Version-List'
    | 'Sec-CH-UA-Full-Version'
    | 'Sec-CH-UA-Mobile'
    | 'Sec-CH-UA-Model'
    | 'Sec-CH-UA-Platform'
    | 'Sec-CH-UA-Platform-Version'
    | 'Sec-CH-Prefers-Reduced-Motion'
    | 'Sec-CH-Prefers-Color-Scheme'
    | 'Device-Memory'
    | 'Width'
    | 'Viewport-Width'
    | 'Save-Data'
    | 'Downlink'
    | 'ECT'
    | 'RTT'
    | AnyString
  'Access-Control-Allow-Credentials': 'true' | 'false' | AnyString
  'Access-Control-Allow-Headers': RequestHeaderName | AnyString
  'Access-Control-Allow-Methods': HTTPMethod | AnyString
  'Access-Control-Allow-Origin': '*' | AnyString
  'Access-Control-Expose-Headers': RequestHeaderName | AnyString
  'Access-Control-Max-Age': AnyString
  'Access-Control-Request-Headers': RequestHeaderName | AnyString
  'Access-Control-Request-Method': HTTPMethod | AnyString
  'Age': AnyString
  'Allow': HTTPMethod | AnyString
  'Authorization': AnyString
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
  'Connection': 'keep-alive' | 'close' | 'upgrade' | AnyString
  'Content-Disposition': AnyString
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
  'Content-Type': MimeType | AnyString
  'Cookie': AnyString
  'Critical-CH': AnyString
  'Date': AnyString
  'Device-Memory': '0.25' | '0.5' | '1' | '2' | '4' | '8' | AnyString
  'Digest': AnyString
  'ETag': AnyString
  'Expect': '100-continue' | AnyString
  'Expires': AnyString
  'Forwarded': AnyString
  'From': AnyString
  'Host': AnyString
  'If-Match': AnyString
  'If-Modified-Since': AnyString
  'If-None-Match': AnyString
  'If-Range': AnyString
  'If-Unmodified-Since': AnyString
  'Keep-Alive': `timeout=${string}, max=${string}` | AnyString
  'Last-Modified': AnyString
  'Link': AnyString
  'Location': AnyString
  'Max-Forwards': AnyString
  'Origin': AnyString
  'Origin-Agent-Cluster': `?1` | `?0` | AnyString
  'Ping-From': AnyString
  'Ping-To': AnyString
  'Pragma': AnyString
  'Proxy-Authenticate': AnyString
  'Proxy-Authorization': AnyString
  'Range': AnyString
  'Referer': AnyString
  'Referrer-Policy':
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | AnyString
  'Retry-After': AnyString
  'Save-Data': `on` | `off` | AnyString
  'Sec-CH-UA': AnyString
  'Sec-CH-UA-Arch':
    | 'x86'
    | 'ARM'
    | '[arm64-v8a, armeabi-v7a, armeabi]'
    | AnyString
  'Sec-CH-UA-Bitness': '64' | '32' | AnyString
  'Sec-CH-UA-Full-Version-List': AnyString
  'Sec-CH-UA-Mobile': `?1` | `?0` | AnyString
  'Sec-CH-UA-Model': AnyString
  'Sec-CH-UA-Platform':
    | 'Android'
    | 'Chrome OS'
    | 'Chromium OS'
    | 'iOS'
    | 'Linux'
    | 'macOS'
    | 'Windows'
    | 'Unknown'
    | AnyString
  'Sec-CH-UA-Platform-Version': AnyString
  'Sec-CH-UA-Prefers-Color-Scheme': 'dark' | 'light' | AnyString
  'Sec-CH-UA-Prefers-Reduced-Motion': 'no-preference' | 'reduce' | AnyString
  'Sec-Fetch-Dest':
    | 'audio'
    | 'audioworklet'
    | 'document'
    | 'embed'
    | 'empty'
    | 'font'
    | 'frame'
    | 'iframe'
    | 'image'
    | 'manifest'
    | 'object'
    | 'paintworklet'
    | 'report'
    | 'script'
    | 'serviceworker'
    | 'sharedworker'
    | 'style'
    | 'track'
    | 'video'
    | 'worker'
    | 'xslt'
    | AnyString
  'Sec-Fetch-Mode':
    | 'cors'
    | 'navigate'
    | 'no-cors'
    | 'same-origin'
    | 'websocket'
    | AnyString
  'Sec-Fetch-Site':
    | 'cross-site'
    | 'same-origin'
    | 'same-site'
    | 'none'
    | AnyString
  'Sec-Fetch-User': '?1' | AnyString
  'Sec-Purpose': 'prefetch' | AnyString
  'Sec-WebSocket-Accept': AnyString
  'Sec-WebSocket-Extensions': AnyString
  'Sec-WebSocket-Key': AnyString
  'Sec-WebSocket-Protocol': AnyString
  'Sec-WebSocket-Version': AnyString
  'Server': AnyString
  'Service-Worker-Allowed': AnyString
  'Set-Cookie': AnyString
  'Strict-Transport-Security': AnyString
  'TE': 'trailers' | AnyString
  'Trailer': AnyString
  'Transfer-Encoding':
    | 'chunked'
    | 'compress'
    | 'deflate'
    | 'gzip'
    | 'identity'
    | AnyString
  'Upgrade': AnyString
  'Upgrade-Insecure-Requests': '1' | AnyString
  'User-Agent': AnyString
  'Vary': AnyString
  'Via': AnyString
  'Warning': AnyString
  'WWW-Authenticate': AnyString
  'X-Content-Type-Options': 'nosniff' | AnyString
  'X-DNS-Prefetch-Control': 'on' | 'off' | AnyString
  'X-Forwarded-For': AnyString
  'X-Forwarded-Host': AnyString
  'X-Forwarded-Proto': AnyString
  'X-Frame-Options': 'deny' | 'sameorigin' | AnyString
  'X-Permitted-Cross-Domain-Policies':
    | 'none'
    | 'master-only'
    | 'by-content-type'
    | 'all'
    | AnyString
  'X-Pingback': AnyString
  'X-Requested-With': AnyString
  'X-XSS-Protection': '0' | '1' | '1; mode=block' | AnyString
}

export interface ResponseHeaderMap {}

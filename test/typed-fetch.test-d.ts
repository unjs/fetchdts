import type { TypedHeaders, TypedRequest, TypedResponse } from '../src/fetch'
import type { RequestHeaderMap, ResponseHeaderMap } from '../src/http'
import { describe, expectTypeOf, it } from 'vitest'

describe('TypedHeaders', () => {
  it('should type header operations correctly', () => {
    interface TestHeaderMap {
      'content-type': 'application/json' | 'text/plain'
      'authorization': `Bearer ${string}`
    }

    type TestHeaders = TypedHeaders<TestHeaderMap>

    // get method should return typed values or null
    expectTypeOf<TestHeaders['get']>().parameter(0).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
    expectTypeOf<TestHeaders['get']>().returns.toEqualTypeOf<string | null>()

    // has method should accept header names
    expectTypeOf<TestHeaders['has']>().parameter(0).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
    expectTypeOf<TestHeaders['has']>().returns.toEqualTypeOf<boolean>()

    // set method should accept typed values
    expectTypeOf<TestHeaders['set']>().parameter(0).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
    expectTypeOf<TestHeaders['set']>().parameter(1).toEqualTypeOf<string>()
    expectTypeOf<TestHeaders['set']>().returns.toEqualTypeOf<void>()

    // append method should accept typed values
    expectTypeOf<TestHeaders['append']>().parameter(0).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
    expectTypeOf<TestHeaders['append']>().parameter(1).toEqualTypeOf<'application/json' | 'text/plain' | string>()
    expectTypeOf<TestHeaders['append']>().returns.toEqualTypeOf<void>()

    // delete method should accept header names
    expectTypeOf<TestHeaders['delete']>().parameter(0).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
    expectTypeOf<TestHeaders['delete']>().returns.toEqualTypeOf<void>()

    const a = {} as TestHeaders
    a.forEach((value, key, parent) => {
      expectTypeOf(parent).toEqualTypeOf<TestHeaders>()
      expectTypeOf(key).toEqualTypeOf<'content-type' | 'authorization' | string & {}>()
      if (key === 'content-type') {
        expectTypeOf(key).toEqualTypeOf<'content-type' | string & {}>()
        expectTypeOf(value).toEqualTypeOf<'application/json' | 'text/plain' | `Bearer ${string}` | string & {}>()
      }
    })
  })

  it('should handle case-insensitive header names', () => {
    interface TestHeaderMap {
      'Content-Type': 'application/json'
      'X-Custom': string
    }
    type TestHeaders = TypedHeaders<TestHeaderMap>

    // Should accept both cases for known headers
    const headers = {} as TestHeaders

    // These should be valid calls (testing that lowercase works)
    expectTypeOf(headers.get).toBeCallableWith('content-type')
    expectTypeOf(headers.get).toBeCallableWith('Content-Type')
    expectTypeOf(headers.get).toBeCallableWith('x-custom')
    expectTypeOf(headers.get).toBeCallableWith('X-Custom')

    // Unknown headers should fallback to string
    expectTypeOf(headers.get).toBeCallableWith('unknown-header')
  })

  it('should preserve Headers interface methods', () => {
    type TestHeaders = TypedHeaders<{ 'content-type': string }>

    // Should have all Headers methods
    expectTypeOf<TestHeaders>().toHaveProperty('getSetCookie')
    expectTypeOf<TestHeaders['getSetCookie']>().returns.toEqualTypeOf<string[]>()

    expectTypeOf<keyof TestHeaders>().toEqualTypeOf<keyof Headers>()
  })

  it('should work with unknown header types', () => {
    type TestHeaders = TypedHeaders<unknown>

    // Should fallback to string for all operations
    expectTypeOf<TestHeaders['get']>().returns.toEqualTypeOf<string | null>()
    expectTypeOf<TestHeaders['set']>().parameter(1).toEqualTypeOf<string>()
  })

  it('should work with standard header maps', () => {
    type RequestHeaders = TypedHeaders<RequestHeaderMap>
    type ResponseHeaders = TypedHeaders<ResponseHeaderMap>

    // Should accept standard headers
    expectTypeOf<RequestHeaders['get']>().toBeCallableWith('authorization')
    expectTypeOf<RequestHeaders['get']>().toBeCallableWith('content-type')
    expectTypeOf<RequestHeaders['get']>().toBeCallableWith('user-agent')

    expectTypeOf<ResponseHeaders['get']>().toBeCallableWith('content-type')
    expectTypeOf<ResponseHeaders['get']>().toBeCallableWith('cache-control')
    expectTypeOf<ResponseHeaders['get']>().toBeCallableWith('set-cookie')
  })
})

describe('TypedResponse', () => {
  it('should type response body correctly', () => {
    type UserResponse = TypedResponse<{ id: number, name: string }>

    // json() should return the typed body
    expectTypeOf<UserResponse['json']>().returns.toEqualTypeOf<Promise<{ id: number, name: string }>>()

    // clone() should return TypedResponse with same types
    expectTypeOf<UserResponse['clone']>().returns.toEqualTypeOf<UserResponse>()
  })

  it('should type response headers correctly', () => {
    interface CustomHeaders {
      'x-rate-limit': string
      'x-total-count': string
    }
    type CustomResponse = TypedResponse<unknown, CustomHeaders>

    // headers should be TypedHeaders with custom header map
    expectTypeOf<CustomResponse['headers']>().toEqualTypeOf<TypedHeaders<CustomHeaders>>()

    // Should be able to get typed headers
    const response = {} as CustomResponse
    expectTypeOf(response.headers.get).toBeCallableWith('x-rate-limit')
    expectTypeOf(response.headers.get).toBeCallableWith('x-total-count')
  })

  it('should preserve Response interface properties', () => {
    type TestResponse = TypedResponse<string>

    // Should have all Response properties except the overridden ones
    expectTypeOf<TestResponse>().toHaveProperty('status')
    expectTypeOf<TestResponse>().toHaveProperty('statusText')
    expectTypeOf<TestResponse>().toHaveProperty('ok')
    expectTypeOf<TestResponse>().toHaveProperty('redirected')
    expectTypeOf<TestResponse>().toHaveProperty('type')
    expectTypeOf<TestResponse>().toHaveProperty('url')
    expectTypeOf<TestResponse>().toHaveProperty('body')
    expectTypeOf<TestResponse>().toHaveProperty('bodyUsed')

    // Should have response-specific methods
    expectTypeOf<TestResponse>().toHaveProperty('arrayBuffer')
    expectTypeOf<TestResponse>().toHaveProperty('blob')
    expectTypeOf<TestResponse>().toHaveProperty('formData')
    expectTypeOf<TestResponse>().toHaveProperty('text')

    // Verify types of properties
    expectTypeOf<TestResponse['status']>().toEqualTypeOf<number>()
    expectTypeOf<TestResponse['statusText']>().toEqualTypeOf<string>()
    expectTypeOf<TestResponse['ok']>().toEqualTypeOf<boolean>()
    expectTypeOf<TestResponse['arrayBuffer']>().returns.toEqualTypeOf<Promise<ArrayBuffer>>()
    expectTypeOf<TestResponse['text']>().returns.toEqualTypeOf<Promise<string>>()
  })

  it('should work with different body types', () => {
    // String response
    type StringResponse = TypedResponse<string>
    expectTypeOf<StringResponse['json']>().returns.toEqualTypeOf<Promise<string>>()

    // Array response
    type ArrayResponse = TypedResponse<Array<{ id: number }>>
    expectTypeOf<ArrayResponse['json']>().returns.toEqualTypeOf<Promise<Array<{ id: number }>>>()

    // Union type response
    type UnionResponse = TypedResponse<{ success: true, data: string } | { success: false, error: string }>
    expectTypeOf<UnionResponse['json']>().returns.toEqualTypeOf<Promise<{ success: true, data: string } | { success: false, error: string }>>()

    // null response
    type NullResponse = TypedResponse<null>
    expectTypeOf<NullResponse['json']>().returns.toEqualTypeOf<Promise<null>>()
  })

  it('should default to unknown body and ResponseHeaderMap headers', () => {
    type DefaultResponse = TypedResponse

    expectTypeOf<DefaultResponse['json']>().returns.toEqualTypeOf<Promise<unknown>>()
    expectTypeOf<DefaultResponse['headers']>().toEqualTypeOf<TypedHeaders<ResponseHeaderMap>>()
  })

  it('should work with schema-defined response headers', () => {
    interface SchemaHeaders {
      'content-type': 'application/json'
      'x-rate-limit-remaining': string
      'x-rate-limit-reset': string
    }
    type APIResponse = TypedResponse<{ users: Array<{ id: number }> }, SchemaHeaders>

    const response = {} as APIResponse

    // Should provide typed access to schema headers
    expectTypeOf(response.headers.get('content-type')).toEqualTypeOf<'application/json' | null>()
    expectTypeOf(response.headers.get('x-rate-limit-remaining')).toEqualTypeOf<string | null>()

    // json() should return typed body
    expectTypeOf(response.json()).toEqualTypeOf<Promise<{ users: Array<{ id: number }> }>>()
  })
})

describe('TypedRequest', () => {
  it('should type request body correctly', () => {
    type CreateUserRequest = TypedRequest<{ name: string, email: string }>

    // json() should return the typed body
    expectTypeOf<CreateUserRequest['json']>().returns.toEqualTypeOf<Promise<{ name: string, email: string }>>()

    // clone() should return TypedRequest with same header type
    expectTypeOf<CreateUserRequest['clone']>().returns.toEqualTypeOf<TypedRequest<{ name: string, email: string }, ResponseHeaderMap>>()
  })

  it('should type request headers correctly', () => {
    interface CustomHeaders {
      'authorization': `Bearer ${string}`
      'x-api-key': string
      'content-type': 'application/json'
    }
    type CustomRequest = TypedRequest<unknown, CustomHeaders>

    // headers should be TypedHeaders with custom header map
    expectTypeOf<CustomRequest['headers']>().toEqualTypeOf<TypedHeaders<CustomHeaders>>()

    // Should be able to get typed headers
    const request = {} as CustomRequest
    expectTypeOf(request.headers.get).toBeCallableWith('authorization')
    expectTypeOf(request.headers.get).toBeCallableWith('x-api-key')
    expectTypeOf(request.headers.get).toBeCallableWith('content-type')
  })

  it('should preserve Request interface properties', () => {
    type TestRequest = TypedRequest<string>

    // Should have all Request properties except the overridden ones
    expectTypeOf<TestRequest>().toHaveProperty('method')
    expectTypeOf<TestRequest>().toHaveProperty('url')
    expectTypeOf<TestRequest>().toHaveProperty('body')
    expectTypeOf<TestRequest>().toHaveProperty('bodyUsed')
    expectTypeOf<TestRequest>().toHaveProperty('cache')
    expectTypeOf<TestRequest>().toHaveProperty('credentials')
    expectTypeOf<TestRequest>().toHaveProperty('destination')
    expectTypeOf<TestRequest>().toHaveProperty('integrity')
    expectTypeOf<TestRequest>().toHaveProperty('keepalive')
    expectTypeOf<TestRequest>().toHaveProperty('mode')
    expectTypeOf<TestRequest>().toHaveProperty('redirect')
    expectTypeOf<TestRequest>().toHaveProperty('referrer')
    expectTypeOf<TestRequest>().toHaveProperty('referrerPolicy')
    expectTypeOf<TestRequest>().toHaveProperty('signal')

    // Should have request-specific methods
    expectTypeOf<TestRequest>().toHaveProperty('arrayBuffer')
    expectTypeOf<TestRequest>().toHaveProperty('blob')
    expectTypeOf<TestRequest>().toHaveProperty('formData')
    expectTypeOf<TestRequest>().toHaveProperty('text')

    // Verify types of properties
    expectTypeOf<TestRequest['method']>().toEqualTypeOf<string>()
    expectTypeOf<TestRequest['url']>().toEqualTypeOf<string>()
    expectTypeOf<TestRequest['arrayBuffer']>().returns.toEqualTypeOf<Promise<ArrayBuffer>>()
    expectTypeOf<TestRequest['text']>().returns.toEqualTypeOf<Promise<string>>()
  })

  it('should work with different body types', () => {
    // JSON request body
    type JSONRequest = TypedRequest<{ id: number, data: string }>
    expectTypeOf<JSONRequest['json']>().returns.toEqualTypeOf<Promise<{ id: number, data: string }>>()

    // Form data (string body)
    type FormRequest = TypedRequest<string>
    expectTypeOf<FormRequest['json']>().returns.toEqualTypeOf<Promise<string>>()

    // No body (never)
    type NoBodyRequest = TypedRequest<never>
    expectTypeOf<NoBodyRequest['json']>().returns.toEqualTypeOf<Promise<never>>()

    // Binary data
    type BinaryRequest = TypedRequest<ArrayBuffer>
    expectTypeOf<BinaryRequest['json']>().returns.toEqualTypeOf<Promise<ArrayBuffer>>()
  })

  it('should default to unknown body and ResponseHeaderMap headers', () => {
    type DefaultRequest = TypedRequest

    expectTypeOf<DefaultRequest['json']>().returns.toEqualTypeOf<Promise<unknown>>()
    expectTypeOf<DefaultRequest['headers']>().toEqualTypeOf<TypedHeaders<ResponseHeaderMap>>()
  })

  it('should work with schema-defined request headers', () => {
    interface SchemaHeaders {
      'authorization': `Bearer ${string}`
      'x-api-version': '1' | '2'
      'content-type': 'application/json' | 'application/xml'
    }
    type APIRequest = TypedRequest<{ action: string }, SchemaHeaders>

    const request = {} as APIRequest

    // Should provide typed access to schema headers
    expectTypeOf(request.headers.get('authorization')).toEqualTypeOf<`Bearer ${string}` | null>()
    expectTypeOf(request.headers.get('x-api-version')).toEqualTypeOf<'1' | '2' | null>()

    // json() should return typed body
    expectTypeOf(request.json()).toEqualTypeOf<Promise<{ action: string }>>()
  })

  it('should have correct clone method signature', () => {
    interface CustomHeaders { 'x-test': string }
    type CustomRequest = TypedRequest<{ data: string }, CustomHeaders>

    // clone() should return TypedRequest with the Headers type (not Body type)
    // This matches the implementation which has clone: () => TypedRequest<Headers>
    expectTypeOf<CustomRequest['clone']>().returns.toEqualTypeOf<TypedRequest<{ data: string }, CustomHeaders>>()
  })
})

describe('Integration with fetchdts inference types', () => {
  it('should work with TypedFetchResponseBody and TypedFetchResponseHeaders', () => {
    // This test ensures that TypedResponse works well with the inference types
    type GetResponse = TypedResponse<
      Array<{ id: number, name: string }>,
      { 'x-total-count': string }
    >
    type PostResponse = TypedResponse<
      { id: number, name: string, email: string },
      { location: string }
    >

    // Should work correctly
    expectTypeOf<GetResponse['json']>().returns.toEqualTypeOf<Promise<Array<{ id: number, name: string }>>>()
    expectTypeOf<PostResponse['json']>().returns.toEqualTypeOf<Promise<{ id: number, name: string, email: string }>>()

    const getResponse = {} as GetResponse
    const postResponse = {} as PostResponse

    expectTypeOf(getResponse.headers.get('x-total-count')).toEqualTypeOf<string | null>()
    expectTypeOf(postResponse.headers.get('location')).toEqualTypeOf<string | null>()
  })
})

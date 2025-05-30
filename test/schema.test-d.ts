import type { TypedResponse } from '../src/fetch'
import type { HTTPMethod } from '../src/http'
import type { TypedFetchInput, TypedFetchMeta, TypedFetchRequestInit, TypedFetchResponseBody, TypedFetchResponseHeaders } from '../src/inference'
import type { RespectOptionality, Trimmed } from '../src/utils'

import type { ExampleSchema } from './fixture/schema'
import { describe, expectTypeOf, it } from 'vitest'

describe('fetchdts', () => {
  it('should fail with untyped inputs in strict mode', () => {
    // @ts-expect-error not an endpoint, just a path prefix
    infer('/api')

    infer('https://jsonplaceholder.typicode.com/posts')

    // @ts-expect-error not a string
    infer(22)

    // TODO: support falling back to untyped fetch in this case
    // @ts-expect-error this is an untyped fetch input
    infer('http://test.com')
  })

  it.todo('should fall back to untyped fetch in this case when configured')

  it('should type the response', () => {
    expectTypeOf(infer('/api/static', { method: 'POST' })).toEqualTypeOf<{ type: 'static', method: 'POST' }>()

    // should fall back to dynamic parameter
    expectTypeOf(infer('/api/static')).toEqualTypeOf<{ type: 'dynamic', method: 'GET' }>()
  })

  it('should handle options correctly for GET methods', () => {
    expectTypeOf(infer('/methods/get')).toMatchTypeOf<{ method: 'GET' }>()
    expectTypeOf(infer('/methods/get', {})).toMatchTypeOf<{ method: 'GET' }>()
  })

  it('should require options for non-GET methods', () => {
    // @ts-expect-error requires options for non-GET methods
    infer('/methods/post')

    expectTypeOf(infer('/methods/post', { method: 'POST' })).toEqualTypeOf<{ method: 'POST' }>()
  })

  it('should support parameters', () => {
    expectTypeOf(infer('/api/dynamic')).toEqualTypeOf<{ type: 'dynamic', method: 'GET' }>()
    expectTypeOf(infer('https://jsonplaceholder.typicode.com/posts')).toEqualTypeOf<{ id: number }>()
    expectTypeOf(infer('https://jsonplaceholder.typicode.com/posts/test')).toEqualTypeOf<string>()

    // @ts-expect-error dynamic/wildcard parameters require at least one character
    infer('/api/')

    // TODO: would be nice to disallow `/` character
    infer('/api/foo/bob')

    // TODO: would be nice to disallow `/` character
    infer('https://jsonplaceholder.typicode.com/posts/test/foo')
  })

  it('should strip query parameters', () => {
    expectTypeOf(infer('https://jsonplaceholder.typicode.com/posts?test')).toEqualTypeOf<{ id: number }>()
  })

  it('can enforce typed headers', async () => {
    // @ts-expect-error missing authorization header
    infer('/headers/request', { method: 'POST', headers: {} })

    // @ts-expect-error authorization header should be a string
    infer('/headers/request', { method: 'POST', headers: { authorization: 12 } })

    // requires authorization and also accepts additional headers
    infer('/headers/request', {
      method: 'POST',
      headers: {
        authorization: 'my-key',
        other: 'foo',
      },
    })

    // types response headers as well
    const res = inferResponse('/headers/response')
    const header = res.headers.get('content-type')
    const data = await res.json()
    expectTypeOf(header).toEqualTypeOf<'application/json' | null>()
    expectTypeOf(data).toEqualTypeOf<{ type: 'headers', method: 'POST' }>()
  })

  it('can enforce typed body', () => {
    // @ts-expect-error missing body
    infer('/body/required', { method: 'POST' })

    // @ts-expect-error missing body
    infer('/body/required', { method: 'POST', body: {} })

    // @ts-expect-error incorrect type
    infer('/body/required', {
      method: 'POST',
      body: {
        id: 'bar',
      },
    })

    infer('/body/required', {
      method: 'POST',
      body: {
        id: 200,
      },
    })

    infer('/body/optional', {
      method: 'POST',
    })
  })

  it('can enforce typed query', () => {
    // @ts-expect-error missing query
    infer('/query/required', { method: 'POST' })

    // @ts-expect-error missing query
    infer('/query/required', { method: 'POST', query: {} })

    // @ts-expect-error incorrect type
    infer('/query/required', {
      method: 'POST',
      query: {
        id: 'bar',
      },
    })

    infer('/query/required', {
      method: 'POST',
      query: {
        id: 200,
      },
    })

    infer('/query/optional', {
      method: 'POST',
    })
  })
})

type CustomTypedFetchRequestInit<Schema, T extends TypedFetchInput<Schema>> = TypedFetchRequestInit<Schema, T> & RespectOptionality<TypedFetchMeta<Schema, T>, 'query', Record<string, unknown>>

function infer<T extends TypedFetchInput<ExampleSchema>, Init extends CustomTypedFetchRequestInit<ExampleSchema, T>>(_input: T, _init: Init): TypedFetchResponseBody<ExampleSchema, Trimmed<T>, Init['method'] extends HTTPMethod ? Init['method'] : 'GET'>

function infer<T extends TypedFetchInput<ExampleSchema, 'GET'>, Init extends CustomTypedFetchRequestInit<ExampleSchema, T>>(_input: T, _init?: Init): TypedFetchResponseBody<ExampleSchema, Trimmed<T>, 'GET'>

function infer(_input: any, _init?: any) {
  return {} as any
}

function inferResponse<T extends TypedFetchInput<ExampleSchema>, Init extends CustomTypedFetchRequestInit<ExampleSchema, T>>(_input: T, _init: Init): TypedResponse<TypedFetchResponseBody<ExampleSchema, Trimmed<T>, Init['method'] extends HTTPMethod ? Init['method'] : 'GET'>, TypedFetchResponseHeaders<ExampleSchema, Trimmed<T>, Init['method'] extends HTTPMethod ? Init['method'] : 'GET'>>

function inferResponse<T extends TypedFetchInput<ExampleSchema, 'GET'>, Init extends CustomTypedFetchRequestInit<ExampleSchema, T>>(_input: T, _init?: Init): TypedResponse<TypedFetchResponseBody<ExampleSchema, Trimmed<T>, 'GET'>, TypedFetchResponseHeaders<ExampleSchema, Trimmed<T>, 'GET'>>

function inferResponse(_input: any, _init?: any) {
  return {} as any
}

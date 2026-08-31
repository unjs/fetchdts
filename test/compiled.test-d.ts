import type { AnyFetchPath, AnyHTTPMethod } from '../src/inference'
import type { ErrorBody, Methods, Path, RequestBody, RequestQuery, Requires, Response, ResponseHeaders, ValidInput } from './fixture/generated'
import type { Response as ExtensibleResponse, ValidInput as ExtensibleValid } from './fixture/generated-extensible'
import { describe, expectTypeOf, it } from 'vitest'
import './fixture/extensible-augmented'
import './fixture/generated-augmented'

// a consumer of the compiler's output, naming only emitted types and the path pattern
interface Options<T extends string, M extends AnyHTTPMethod> {
  method?: M
  body?: RequestBody<T, M>
  query?: RequestQuery<T, M>
  key?: string
}
declare function $fetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
  input: T & ValidInput<T, M>,
  options?: Options<T, M>,
): Promise<Response<T, M>>
declare function $fetch<T extends Path, M extends AnyHTTPMethod = 'GET'>(
  input: T & ValidInput<T, M>,
  options?: Options<T, M>,
): Promise<Response<T, M>>

describe('the compiler output', () => {
  it('resolves a static path through the exact table', async () => {
    expectTypeOf(await $fetch('/api/health')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await $fetch('/api/users')).toEqualTypeOf<{ id: number }[]>()
    expectTypeOf(await $fetch('/api/comments/latest')).toEqualTypeOf<{ latest: true }>()
  })

  it('resolves a path through a parameter or a wildcard by walking the tree', async () => {
    expectTypeOf(await $fetch('/api/users/1')).toEqualTypeOf<{ id: number, name: string }>()
    expectTypeOf(await $fetch('/api/users/1/posts')).toEqualTypeOf<{ title: string }[]>()
    expectTypeOf(await $fetch('/api/files/a/b.txt')).toEqualTypeOf<Blob>()
    expectTypeOf(await $fetch('/api/files')).toEqualTypeOf<Blob>()
  })

  it('resolves a second root, reached by origin', async () => {
    expectTypeOf(await $fetch('https://api.example.com/v1/posts')).toEqualTypeOf<{ id: number }[]>()
    expectTypeOf(await $fetch('https://api.example.com/v1/posts/1')).toEqualTypeOf<{ id: number }>()
  })

  it('narrows by method, including the every-method form', async () => {
    expectTypeOf(await $fetch('/api/users', { method: 'POST', body: { name: 'x' } })).toEqualTypeOf<{ id: number }>()
    expectTypeOf(await $fetch('/api/search', { method: 'POST', body: { query: 'x' } })).toEqualTypeOf<{ results: string[], total: number }>()
    expectTypeOf(await $fetch('/api/search', { method: 'PATCH' })).toEqualTypeOf<{ results: string[] }>()
    expectTypeOf(await $fetch('/api/ping', { method: 'DELETE' })).toEqualTypeOf<'pong'>()
    expectTypeOf(await $fetch('/api/health', { method: 'head' })).toEqualTypeOf<{ status: 'ok' }>()
  })

  it('keeps a route registered without a return type callable', async () => {
    expectTypeOf(await $fetch('/api/proxy')).toBeUnknown()
    expectTypeOf(await $fetch('/api/proxy', { method: 'DELETE' })).toBeUnknown()
  })

  it('ignores a query string, a fragment and a trailing slash', async () => {
    expectTypeOf(await $fetch('/api/health?cache=0')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await $fetch('/api/health#top')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await $fetch('/api/health/')).toEqualTypeOf<{ status: 'ok' }>()
  })

  it('rejects an unresolved path, method or body', async () => {
    // @ts-expect-error no such path
    await $fetch('/api/nope')
    // @ts-expect-error method not registered
    await $fetch('/api/health', { method: 'PUT' })
    // @ts-expect-error body does not match
    await $fetch('/api/users', { method: 'POST', body: { name: 1 } })
  })

  it('offers every path for completion', () => {
    expectTypeOf<'/api/health'>().toExtend<Path>()
    expectTypeOf<'https://api.example.com/v1/posts'>().toExtend<Path>()
    expectTypeOf<'/api/nope'>().not.toExtend<Path>()
  })

  it('resolves response headers, error bodies and request fields', () => {
    expectTypeOf<ResponseHeaders<'/api/users/1'>>().toEqualTypeOf<{ 'x-cache': 'hit' | 'miss' }>()
    expectTypeOf<ErrorBody<'/api/users', 'POST'>>().toEqualTypeOf<{ message: string }>()
    expectTypeOf<ErrorBody<'/api/health'>>().toBeUnknown()
    expectTypeOf<RequestBody<'/api/users', 'POST'>>().toEqualTypeOf<{ name: string }>()
    expectTypeOf<Requires<'/api/users', 'POST', 'body'>>().toEqualTypeOf<true>()
    expectTypeOf<Requires<'/api/health', 'GET', 'body'>>().toEqualTypeOf<false>()
  })

  it('composes through a wrapper, and lets a consumer extend the options', () => {
    interface Extended<T extends string, M extends AnyHTTPMethod> extends Options<T, M> {
      retries?: number
    }
    function apiFetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
      input: T & ValidInput<T, M>,
      options?: Extended<T, M>,
    ) {
      const { retries, ...rest } = options ?? {}
      void retries
      return $fetch(input, rest as Options<T, M>)
    }

    expectTypeOf(apiFetch('/api/health')).toEqualTypeOf<Promise<{ status: 'ok' }>>()
    expectTypeOf(apiFetch('/api/users/1', { retries: 2 })).toEqualTypeOf<Promise<{ id: number, name: string }>>()
    // @ts-expect-error no such path through the wrapper
    apiFetch('/api/nope')
  })

  it('resolves a route merged into the generated module, which is incidental rather than supported', async () => {
    expectTypeOf(await $fetch('/api/added')).toEqualTypeOf<{ added: true }>()
    expectTypeOf(await $fetch('/api/added/1')).toEqualTypeOf<{ added: 'param' }>()
    // the emitted union is source, so a merged route is callable but not offered
    expectTypeOf<'/api/added'>().not.toExtend<Path>()
  })
})

describe('the compiler output, for an input that is not a path', () => {
  // the emitted accessors do not constrain the path, so a client admitting what `fetch` admits can
  // name them in its own signature
  function fetchAny<T extends AnyFetchPath | Request | URL, M extends AnyHTTPMethod = 'GET'>(
    _input: T & ValidInput<T, M>,
    _options?: { method?: M, body?: RequestBody<T, M>, query?: RequestQuery<T, M> },
  ): Promise<Response<T, M>> {
    return undefined as never
  }

  it('is accepted, and says nothing about the response or the failure', async () => {
    expectTypeOf(await fetchAny(new Request('https://example.com'))).toBeUnknown()
    expectTypeOf(await fetchAny(new URL('https://example.com'))).toBeUnknown()
    expectTypeOf<ValidInput<Request>>().toBeUnknown()
    expectTypeOf<Response<Request>>().toBeUnknown()
    expectTypeOf<ErrorBody<Request>>().toBeUnknown()
    expectTypeOf<ErrorBody<URL>>().toBeUnknown()
  })

  it('resolves nothing for a path known only to be a string, which is rejected input', () => {
    expectTypeOf<ValidInput<string>>().not.toBeUnknown()
    expectTypeOf<Response<string>>().toBeNever()
    expectTypeOf<ErrorBody<string>>().toBeNever()
  })

  it('falls back for the request fields', () => {
    expectTypeOf<RequestBody<Request>>().toEqualTypeOf<BodyInit | null>()
    expectTypeOf<RequestQuery<Request>>().toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf<Requires<Request, 'GET', 'body'>>().toEqualTypeOf<false>()
  })

  it('still resolves a declared error body, and stays unknown without one', () => {
    expectTypeOf<ErrorBody<'/api/users', 'POST'>>().toEqualTypeOf<{ message: string }>()
    expectTypeOf<ErrorBody<'/api/health'>>().toBeUnknown()
  })
})

describe('accessors resolving against an extensible interface', () => {
  it('finds a route added by hand, and keeps the table for a generated one', async () => {
    // accessors bound to the emitted interface cannot see an augmentation, which targets the
    // interface a consumer declares
    expectTypeOf(await extensibleFetch('/api/health')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await extensibleFetch('/api/by-hand')).toEqualTypeOf<{ byHand: true }>()
    expectTypeOf(await extensibleFetch('/api/by-hand/1')).toEqualTypeOf<{ byHand: 'param' }>()
    expectTypeOf(await extensibleFetch('/api/users/1/posts')).toEqualTypeOf<{ title: string }[]>()
    // @ts-expect-error still nothing else
    await extensibleFetch('/api/nope')
  })
})

declare function extensibleFetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
  input: T & ExtensibleValid<T, M>,
  options?: { method?: M },
): Promise<ExtensibleResponse<T, M>>

describe('a single signature offering completions and validation', () => {
  // the union in the constraint is what an editor completes from; the validator is what rejects
  function request<T extends Path | (string & {}), M extends AnyHTTPMethod = 'GET'>(
    _input: T & ValidInput<T, M>,
    _options?: { method?: M, body?: RequestBody<T, M> },
  ): Promise<Response<T, M>> {
    return undefined as never
  }

  it('resolves what the pair resolves', async () => {
    expectTypeOf(await request('/api/health')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await request('/api/users/1')).toEqualTypeOf<{ id: number, name: string }>()
    expectTypeOf(await request('/api/health?cache=0')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await request('/api/users', { method: 'POST', body: { name: 'x' } })).toEqualTypeOf<{ id: number }>()
  })

  it('still rejects a typo, a bad method and a bad body', async () => {
    // @ts-expect-error no such path, despite the constraint accepting any string
    await request('/api/nope')
    // @ts-expect-error method not registered
    await request('/api/health', { method: 'PUT' })
    // @ts-expect-error body does not match
    await request('/api/users', { method: 'POST', body: { name: 1 } })
  })
})

describe('a path built from a runtime value', () => {
  // the path parameter stays plain, since intersecting the validator onto it stops a template
  // literal argument inferring as one; the method carries the check instead
  function request<T extends Path, M extends AnyHTTPMethod = 'GET'>(
    input: T,
    init?: { method?: M & Methods<T>, body?: RequestBody<T, M> },
  ): Promise<Response<T, M>>
  function request<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
    input: T & ValidInput<T, M>,
    init?: { method?: M, body?: RequestBody<T, M> },
  ): Promise<Response<T, M>>
  function request(_input: unknown, _init?: unknown): Promise<unknown> {
    return Promise.resolve(undefined)
  }

  const id = '1' as string

  it('resolves a template literal path', async () => {
    expectTypeOf(await request(`/api/users/${id}`)).toEqualTypeOf<{ id: number, name: string }>()
    expectTypeOf(await request(`/api/files/${id}`)).toEqualTypeOf<Blob>()
  })

  it('still resolves a literal, a query string and a method', async () => {
    expectTypeOf(await request('/api/health')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await request('/api/health?x=1')).toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf(await request('/api/users', { method: 'POST', body: { name: 'x' } })).toEqualTypeOf<{ id: number }>()
  })

  it('reports the methods a path answers, and rejects one it does not', async () => {
    expectTypeOf<Methods<'/api/health'>>().toEqualTypeOf<'GET' | 'HEAD' | 'get' | 'head'>()
    expectTypeOf<Methods<'/api/users'>>().toEqualTypeOf<'GET' | 'POST' | 'HEAD' | 'get' | 'post' | 'head'>()
    // @ts-expect-error the endpoint registers no PUT
    await request('/api/health', { method: 'PUT' })
    // @ts-expect-error no such path
    await request('/api/nope')
  })
})

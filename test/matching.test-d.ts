import type { HTTPMethod } from '../src/http'
import type { AnyFetchPath, AnyHTTPMethod, TypedFetchErrorBody, TypedFetchInput, TypedFetchMethods, TypedFetchRequestBody, TypedFetchRequestHeaders, TypedFetchRequestInit, TypedFetchRequestQuery, TypedFetchRequires, TypedFetchResolvedMeta, TypedFetchResponseBody, ValidFetchInput } from '../src/inference'
import type { DynamicParam, Endpoint, WildcardParam } from '../src/tree'
import type { GeneratedRoutes } from './fixture/generated'
import { describe, expectTypeOf, it } from 'vitest'

interface Overlapping {
  '/api': {
    [DynamicParam]: {
      [Endpoint]: {
        GET: { response: 'B' }
        POST: { body: { id: number }, response: 'A' }
      }
    }
    '/blog': {
      '/thing': { [Endpoint]: { POST: { response: 'D' } } }
      [WildcardParam]: { [Endpoint]: { GET: { response: 'C' } } }
    }
  }
}

describe('overlapping routes narrowed by method', () => {
  it('resolves each method to the endpoint a router would reach', () => {
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/123', 'POST'>>().toEqualTypeOf<'A'>()
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/123', 'GET'>>().toEqualTypeOf<'B'>()
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/blog/x/y', 'GET'>>().toEqualTypeOf<'C'>()
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/blog/thing', 'POST'>>().toEqualTypeOf<'D'>()
  })

  it('falls through a static node that does not answer the method', () => {
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/blog/thing', 'GET'>>().toEqualTypeOf<'C'>()
    // the wildcard under `/blog` matches no segments, which is nearer than the parameter sibling
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/blog', 'GET'>>().toEqualTypeOf<'C'>()
  })

  it('offers every method reachable at a path, not only those of the static node', () => {
    expectTypeOf<TypedFetchResolvedMeta<Overlapping, '/api/blog/thing'>['method']>().toEqualTypeOf<'POST' | 'GET' | 'HEAD'>()

    // a `GET` is reachable, so the method may be omitted, and `POST` is still accepted
    expectTypeOf<{ method?: undefined }>().toExtend<TypedFetchRequestInit<Overlapping, '/api/blog/thing'>>()
    expectTypeOf<{ method: 'POST' }>().toExtend<TypedFetchRequestInit<Overlapping, '/api/blog/thing'>>()
    expectTypeOf<{ method: 'PUT' }>().not.toExtend<TypedFetchRequestInit<Overlapping, '/api/blog/thing'>>()
  })

  it('types the init for the method being requested', () => {
    expectTypeOf<TypedFetchRequestInit<Overlapping, '/api/123', 'POST'>['body']>().toEqualTypeOf<{ id: number }>()
    // a method-agnostic init describes only what every reachable endpoint has in common, so the
    // body of the one method that declares one is not required
    const init: TypedFetchRequestInit<Overlapping, '/api/123'> = { method: 'GET' }
    expectTypeOf(init.method).toEqualTypeOf<'GET' | 'POST' | 'HEAD' | 'get' | 'post' | 'head' | undefined>()
  })
})

interface DynamicAndWildcard {
  '/x': {
    [DynamicParam]: { [Endpoint]: { GET: { response: 'dynamic' } } }
    [WildcardParam]: { [Endpoint]: { GET: { response: 'wildcard' }, POST: { response: 'wildcardPost' } } }
  }
}

interface WildcardBesideEndpoint {
  '/x': {
    [Endpoint]: { GET: { response: 'node' } }
    [WildcardParam]: { [Endpoint]: { GET: { response: 'wildcard' }, POST: { response: 'wildcardPost' } } }
  }
}

interface DeeperDynamic {
  '/x': {
    [WildcardParam]: { [Endpoint]: { GET: { response: 'wildcard' } } }
    [DynamicParam]: { '/sub': { [Endpoint]: { GET: { response: 'deep' } } } }
  }
}

describe('parameter precedence', () => {
  it('prefers a dynamic parameter to a wildcard', () => {
    expectTypeOf<TypedFetchResponseBody<DynamicAndWildcard, '/x/a'>>().toEqualTypeOf<'dynamic'>()
  })

  it('falls back to the wildcard where the dynamic parameter does not match', () => {
    expectTypeOf<TypedFetchResponseBody<DynamicAndWildcard, '/x/a/b'>>().toEqualTypeOf<'wildcard'>()
    expectTypeOf<TypedFetchResponseBody<DynamicAndWildcard, '/x/a', 'POST'>>().toEqualTypeOf<'wildcardPost'>()
  })

  it('lets a wildcard match no segments, and prefers the node itself where it has an endpoint', () => {
    expectTypeOf<TypedFetchResponseBody<DynamicAndWildcard, '/x'>>().toEqualTypeOf<'wildcard'>()
    expectTypeOf<'/x'>().toExtend<TypedFetchInput<DynamicAndWildcard>>()
    expectTypeOf<TypedFetchResponseBody<WildcardBesideEndpoint, '/x'>>().toEqualTypeOf<'node'>()
    expectTypeOf<TypedFetchResponseBody<WildcardBesideEndpoint, '/x', 'POST'>>().toEqualTypeOf<'wildcardPost'>()
  })

  it('prefers a deeper dynamic match to a shallower wildcard', () => {
    expectTypeOf<TypedFetchResponseBody<DeeperDynamic, '/x/a/sub'>>().toEqualTypeOf<'deep'>()
  })

  it('offers the methods of both parameters where no method is given', () => {
    expectTypeOf<TypedFetchResolvedMeta<DynamicAndWildcard, '/x/a'>['method']>().toEqualTypeOf<'GET' | 'HEAD' | 'POST'>()
  })
})

interface GetOnly {
  '/api': {
    '/thing': { [Endpoint]: { GET: { response: 'g' } } }
    '/head': { [Endpoint]: { GET: { response: 'g' }, HEAD: { response: never, responseHeaders: { 'content-length': string } } } }
    '/post': { [Endpoint]: { POST: { response: 'p' } } }
  }
}

describe('HEAD requests', () => {
  it('is answered by the GET handler', () => {
    expectTypeOf<TypedFetchResponseBody<GetOnly, '/api/thing', 'HEAD'>>().toEqualTypeOf<'g'>()
    expectTypeOf<'/api/thing'>().toExtend<TypedFetchInput<GetOnly, 'HEAD'>>()
    expectTypeOf<TypedFetchResolvedMeta<GetOnly, '/api/thing', 'HEAD'>['method']>().toEqualTypeOf<'HEAD'>()
  })

  it('prefers an explicitly registered HEAD endpoint', () => {
    expectTypeOf<TypedFetchResolvedMeta<GetOnly, '/api/head', 'HEAD'>['responseHeaders']>().toEqualTypeOf<{ 'content-length': string }>()
    expectTypeOf<TypedFetchResolvedMeta<GetOnly, '/api/head'>['method']>().toEqualTypeOf<'GET' | 'HEAD'>()
  })

  it('is not offered where there is no GET endpoint', () => {
    expectTypeOf<TypedFetchResponseBody<GetOnly, '/api/post', 'HEAD'>>().toBeNever()
    expectTypeOf<'/api/post'>().not.toExtend<TypedFetchInput<GetOnly, 'HEAD'>>()
  })

  it('is served through a parameter as any other method is', () => {
    expectTypeOf<TypedFetchResponseBody<DynamicAndWildcard, '/x/a', 'HEAD'>>().toEqualTypeOf<'dynamic'>()
  })

  it('is rejected where the parameter it reaches has no GET endpoint', () => {
    interface PostOnlyParam {
      '/api': { [DynamicParam]: { [Endpoint]: { POST: { response: 'p' } } } }
    }
    expectTypeOf<TypedFetchResponseBody<PostOnlyParam, '/api/x', 'HEAD'>>().toBeNever()
    expectTypeOf<TypedFetchResolvedMeta<PostOnlyParam, `/api/${string}`, 'HEAD'>>().toBeNever()
    expectTypeOf<ValidFetchInput<PostOnlyParam, `/api/${string}`, 'HEAD'>>().not.toBeUnknown()
  })
})

describe('methods written in lowercase', () => {
  it('resolves as the uppercase method does', () => {
    expectTypeOf<TypedFetchResponseBody<Overlapping, '/api/123', 'post'>>().toEqualTypeOf<'A'>()
    expectTypeOf<TypedFetchResponseBody<GetOnly, '/api/thing', 'head'>>().toEqualTypeOf<'g'>()
    expectTypeOf<'/api/thing'>().toExtend<TypedFetchInput<GetOnly, 'get'>>()
  })

  it('is accepted in the init', () => {
    const init: TypedFetchRequestInit<Overlapping, '/api/123', 'post'> = { method: 'post', body: { id: 1 } }
    expectTypeOf(init.body).toEqualTypeOf<{ id: number }>()
    expectTypeOf(init.method).toEqualTypeOf<'POST' | 'post'>()
  })
})

describe('TypedFetchMethods', () => {
  it('gives the methods a path answers', () => {
    expectTypeOf<TypedFetchMethods<Overlapping, '/api/blog/thing'>>().toEqualTypeOf<'POST' | 'GET' | 'HEAD'>()
  })

  it('gives every method where the path resolves to nothing', () => {
    expectTypeOf<TypedFetchMethods<Overlapping, '/nope'>>().toEqualTypeOf<AnyHTTPMethod>()
  })
})

interface Suffixed {
  '/api': {
    '/thing': { [Endpoint]: { GET: { response: 'g' } } }
  }
}

describe('query strings, fragments and trailing slashes', () => {
  it('are ignored when resolving a path', () => {
    expectTypeOf<TypedFetchResponseBody<Suffixed, '/api/thing?id=1'>>().toEqualTypeOf<'g'>()
    expectTypeOf<TypedFetchResponseBody<Suffixed, '/api/thing#top'>>().toEqualTypeOf<'g'>()
    expectTypeOf<TypedFetchResponseBody<Suffixed, '/api/thing/'>>().toEqualTypeOf<'g'>()
    expectTypeOf<TypedFetchRequestInit<Suffixed, '/api/thing?id=1'>>().not.toBeNever()
  })

  it('are accepted by the path validator', () => {
    expectTypeOf<ValidFetchInput<Suffixed, '/api/thing?id=1'>>().toBeUnknown()
    expectTypeOf<ValidFetchInput<Suffixed, '/api/thing/'>>().toBeUnknown()
    // the union of paths does not enumerate suffixed forms, as every variant multiplies its size
    expectTypeOf<'/api/thing?id=1'>().not.toExtend<TypedFetchInput<Suffixed>>()
  })
})

describe('ValidFetchInput', () => {
  it('accepts a path the schema resolves', () => {
    expectTypeOf<ValidFetchInput<Overlapping, '/api/blog/thing', 'POST'>>().toBeUnknown()
    expectTypeOf<ValidFetchInput<Overlapping, '/api/blog/thing', 'GET'>>().toBeUnknown()
    expectTypeOf<ValidFetchInput<Overlapping, '/api/anything'>>().toBeUnknown()
  })

  it('rejects an unresolved path or an unregistered method, naming the reason', () => {
    expectTypeOf<ValidFetchInput<Suffixed, '/nope'>>().toEqualTypeOf<{ 'fetchdts: no route matches \'/nope\'': never }>()
    expectTypeOf<ValidFetchInput<Suffixed, '/api/thing', 'PUT'>>().toEqualTypeOf<{ 'fetchdts: no PUT route matches \'/api/thing\'': never }>()
  })

  it('requires every member of a union of paths to resolve', () => {
    expectTypeOf<ValidFetchInput<Suffixed, '/api/thing' | '/nope'>>().toEqualTypeOf<{ 'fetchdts: no route matches \'/nope\'': never }>()
    expectTypeOf<ValidFetchInput<Suffixed, '/api/thing' | '/api/thing?x=1'>>().toBeUnknown()
  })

  it('is usable in parameter position', () => {
    function request<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(
      _input: T & ValidFetchInput<Overlapping, T, M>,
      _init?: TypedFetchRequestInit<Overlapping, T, M> & { method?: M },
    ): TypedFetchResponseBody<Overlapping, T, M> {
      return undefined as never
    }

    expectTypeOf(request('/api/blog/thing')).toEqualTypeOf<'C'>()
    expectTypeOf(request('/api/blog/thing', { method: 'POST' })).toEqualTypeOf<'D'>()
    // @ts-expect-error no such path
    request('/nope')
    // @ts-expect-error method not registered at this path
    request('/api/blog/thing', { method: 'PUT' })
  })
})

interface Siblings {
  '/api/posts': {
    '/static': { [Endpoint]: { GET: { response: 'static' } } }
    '/item-x': { [Endpoint]: { GET: { response: 'prefixed' } } }
    [DynamicParam]: { [Endpoint]: { GET: { response: 'param' } } }
  }
}

interface DeeperSibling {
  '/api': {
    '/blog': { '/thing': { [Endpoint]: { POST: { response: 'D' }, GET: { response: 'G' } } } }
    [DynamicParam]: { [Endpoint]: { GET: { response: 'param' } } }
  }
}

describe('segments known only at runtime', () => {
  it('includes the static siblings the request could also match', () => {
    expectTypeOf<TypedFetchResponseBody<Siblings, `/api/posts/${string}`>>().toEqualTypeOf<'static' | 'prefixed' | 'param'>()
  })

  it('includes a static sibling behind a literal prefix', () => {
    expectTypeOf<TypedFetchResponseBody<Siblings, `/api/posts/item-${string}`>>().toEqualTypeOf<'prefixed' | 'param'>()
  })

  it('resolves a segment that is known exactly', () => {
    expectTypeOf<TypedFetchResponseBody<Siblings, '/api/posts/123'>>().toEqualTypeOf<'param'>()
    expectTypeOf<TypedFetchResponseBody<Siblings, '/api/posts/static'>>().toEqualTypeOf<'static'>()
    expectTypeOf<TypedFetchResponseBody<Siblings, '/api/posts/item-x'>>().toEqualTypeOf<'prefixed'>()
  })

  it('follows a static sibling deeper than the parameter reaches', () => {
    expectTypeOf<TypedFetchResponseBody<DeeperSibling, `/api/${string}/thing`, 'POST'>>().toEqualTypeOf<'D'>()
    expectTypeOf<TypedFetchResponseBody<DeeperSibling, `/api/${string}/thing`, 'GET'>>().toEqualTypeOf<'G'>()
    expectTypeOf<TypedFetchResponseBody<DeeperSibling, `/api/${string}`, 'GET'>>().toEqualTypeOf<'param'>()
  })
})

interface StaticAndParam {
  '/api': {
    '/users': { [Endpoint]: { GET: { response: 'usersGet' }, POST: { response: 'usersPost' } } }
    [DynamicParam]: { [Endpoint]: { PUT: { response: 'paramPut' } } }
  }
}

describe('router parity', () => {
  it('prefers a static segment, and falls through for a method it does not answer', () => {
    expectTypeOf<TypedFetchResponseBody<StaticAndParam, '/api/users'>>().toEqualTypeOf<'usersGet'>()
    expectTypeOf<TypedFetchResponseBody<StaticAndParam, '/api/users', 'PUT'>>().toEqualTypeOf<'paramPut'>()
    expectTypeOf<TypedFetchResponseBody<StaticAndParam, '/api/users', 'DELETE'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<StaticAndParam, '/api/other', 'PUT'>>().toEqualTypeOf<'paramPut'>()
    expectTypeOf<TypedFetchResponseBody<StaticAndParam, '/api/other'>>().toBeNever()
  })

  it('offers every method the path answers where none is given', () => {
    expectTypeOf<TypedFetchResolvedMeta<StaticAndParam, '/api/users'>['method']>().toEqualTypeOf<'GET' | 'POST' | 'HEAD' | 'PUT'>()
  })
})

describe('the documented fetch signature', () => {
  interface Documented {
    '/api/health': { [Endpoint]: { GET: { response: 'ok' } } }
    '/api/users': {
      [Endpoint]: { GET: { response: 'users' }, POST: { body: { name: string }, response: 'made' } }
      [DynamicParam]: { [Endpoint]: { GET: { response: 'user' } } }
    }
    '/api/files': { [WildcardParam]: { [Endpoint]: { GET: { response: 'file' } } } }
  }

  // the first signature answers any call that resolves, so the union of every path is instantiated
  // only for a call that does not, and for completions
  function request<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(
    _input: T & ValidFetchInput<Documented, T, M>,
    _init?: TypedFetchRequestInit<Documented, T, M> & { method?: M },
  ): TypedFetchResponseBody<Documented, T, M>
  function request<T extends TypedFetchInput<Documented>, M extends HTTPMethod = 'GET'>(
    _input: T,
    _init?: TypedFetchRequestInit<Documented, T, M> & { method?: M },
  ): TypedFetchResponseBody<Documented, T, M>
  function request(_input: string, _init?: unknown): unknown {
    return undefined
  }

  it('types every kind of path', () => {
    expectTypeOf(request('/api/health')).toEqualTypeOf<'ok'>()
    expectTypeOf(request('/api/users/123')).toEqualTypeOf<'user'>()
    expectTypeOf(request('/api/files/a/b')).toEqualTypeOf<'file'>()
    expectTypeOf(request('/api/files')).toEqualTypeOf<'file'>()
    expectTypeOf(request('/api/health?cache=0')).toEqualTypeOf<'ok'>()
    expectTypeOf(request('/api/users', { method: 'POST', body: { name: 'x' } })).toEqualTypeOf<'made'>()
  })

  it('types a path built from a runtime value', () => {
    const id = '123' as string
    expectTypeOf(request(`/api/users/${id}`)).toEqualTypeOf<'user'>()
  })

  it('rejects a path or a method the schema does not answer', () => {
    // @ts-expect-error no such path
    request('/api/nope')
    // @ts-expect-error method not registered at this path
    request('/api/health', { method: 'PUT' })
    // @ts-expect-error body does not match
    request('/api/users', { method: 'POST', body: { name: 1 } })
  })
})

describe('a composable wrapping the fetch signature', () => {
  interface Composable {
    '/api/health': { [Endpoint]: { GET: { response: { status: 'ok' } } } }
    '/api/users': { [DynamicParam]: { [Endpoint]: { GET: { response: { id: number } } } } }
  }

  interface Ref<T> { value: T }
  type MaybeRefOrGetter<T> = T | Ref<T> | (() => T)
  const ref = <T>(value: T): Ref<T> => ({ value })

  // the validator is intersected with the whole parameter, not with the path inside it, so that `T`
  // is still inferred through a `Ref` or a getter
  function useFetch<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(
    _url: MaybeRefOrGetter<T> & ValidFetchInput<Composable, T, M>,
    _options?: TypedFetchRequestInit<Composable, T, M> & { method?: M },
  ): { data: Ref<TypedFetchResponseBody<Composable, T, M> | null> } {
    return { data: { value: null } } as never
  }

  it('types a path passed directly', () => {
    expectTypeOf(useFetch('/api/health').data.value).toEqualTypeOf<{ status: 'ok' } | null>()
  })

  it('types a path passed as a ref', () => {
    expectTypeOf(useFetch(ref('/api/health')).data.value).toEqualTypeOf<{ status: 'ok' } | null>()
  })

  it('types a path built by a getter', () => {
    const id = ref('1')
    expectTypeOf(useFetch(() => `/api/users/${id.value}`).data.value).toEqualTypeOf<{ id: number } | null>()
  })

  it('rejects an unresolved path through any of them', () => {
    // @ts-expect-error no such path
    useFetch('/api/nope')
    // @ts-expect-error no such path
    useFetch(ref('/api/nope'))
    // @ts-expect-error no such path
    useFetch(() => '/api/nope')
    // @ts-expect-error a path known only to be a string matches nothing
    useFetch(ref('/api/health' as string))
  })
})

describe('keyed static lookup', () => {
  interface Flat {
    '/a': { [Endpoint]: { GET: { response: 'a' } } }
    '/user': { [Endpoint]: { GET: { response: 'user' } } }
    '/users': { [Endpoint]: { GET: { response: 'users' }, POST: { body: { n: 1 }, response: 'made' } } }
    '/users-archived': { [Endpoint]: { GET: { response: 'archived' } } }
  }

  interface Combined {
    '/api': { '/posts': { [Endpoint]: { GET: { response: 'nested' } } } }
    '/api/comments': { [Endpoint]: { GET: { response: 'combined' } } }
  }

  interface Origin {
    'https://example.com': {
      '/posts': { [Endpoint]: { GET: { response: 'post' } } }
      [WildcardParam]: { [Endpoint]: { GET: { response: 'any' } } }
    }
  }

  it('distinguishes keys that are prefixes of each other', () => {
    expectTypeOf<TypedFetchResponseBody<Flat, '/user'>>().toEqualTypeOf<'user'>()
    expectTypeOf<TypedFetchResponseBody<Flat, '/users'>>().toEqualTypeOf<'users'>()
    expectTypeOf<TypedFetchResponseBody<Flat, '/users-archived'>>().toEqualTypeOf<'archived'>()
    expectTypeOf<TypedFetchResponseBody<Flat, '/users', 'POST'>>().toEqualTypeOf<'made'>()
    expectTypeOf<TypedFetchResponseBody<Flat, '/use'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<Flat, '/users/1'>>().toBeNever()
  })

  it('still matches a key spanning several segments', () => {
    expectTypeOf<TypedFetchResponseBody<Combined, '/api/posts'>>().toEqualTypeOf<'nested'>()
    expectTypeOf<TypedFetchResponseBody<Combined, '/api/comments'>>().toEqualTypeOf<'combined'>()
    expectTypeOf<TypedFetchResponseBody<Combined, '/api/other'>>().toBeNever()
  })

  it('resolves a path below an origin', () => {
    expectTypeOf<TypedFetchResponseBody<Origin, 'https://example.com/posts'>>().toEqualTypeOf<'post'>()
    expectTypeOf<TypedFetchResponseBody<Origin, 'https://example.com/other/deep'>>().toEqualTypeOf<'any'>()
    expectTypeOf<TypedFetchResponseBody<Origin, 'https://example.com'>>().toEqualTypeOf<'any'>()
    expectTypeOf<TypedFetchResponseBody<Origin, 'https://other.com/posts'>>().toBeNever()
  })

  it('keeps the behaviour the lookup cannot answer for itself', () => {
    // a segment known only at runtime, an implicit HEAD, and the serialized `ALL` form all go
    // through paths the keyed lookup does not take
    expectTypeOf<TypedFetchResponseBody<Siblings, `/api/posts/${string}`>>().toEqualTypeOf<'static' | 'prefixed' | 'param'>()
    expectTypeOf<TypedFetchResponseBody<Flat, '/users', 'HEAD'>>().toEqualTypeOf<'users'>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/ping', 'DELETE'>>().toEqualTypeOf<'pong'>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/search', 'POST'>>().toEqualTypeOf<{ results: string[], total: number }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, `/api/comments/${string}`>>().toEqualTypeOf<{ body: string } | { latest: true }>()
  })
})

describe('error responses', () => {
  interface WithErrors {
    '/api/users': {
      [Endpoint]: {
        GET: { response: { id: number }[], errorResponse: { message: string } }
        POST: { response: { id: number } }
      }
    }
  }

  it('resolves a declared error body, and stays unknown without one', () => {
    expectTypeOf<TypedFetchErrorBody<WithErrors, '/api/users'>>().toEqualTypeOf<{ message: string }>()
    expectTypeOf<TypedFetchErrorBody<WithErrors, '/api/users', 'POST'>>().toBeUnknown()
    expectTypeOf<TypedFetchErrorBody<GeneratedRoutes, '/api/health'>>().toBeUnknown()
  })

  it('does not leak into the response or the init', () => {
    expectTypeOf<TypedFetchResponseBody<WithErrors, '/api/users'>>().toEqualTypeOf<{ id: number }[]>()
    expectTypeOf<'errorResponse' extends keyof TypedFetchRequestInit<WithErrors, '/api/users'> ? true : false>().toEqualTypeOf<false>()
  })
})

describe('a materialised path union', () => {
  interface Materialised {
    '/api': {
      '/health': { [Endpoint]: { GET: { response: 'ok' } } }
      '/users': {
        [Endpoint]: { GET: { response: 'users' }, POST: { body: { name: string }, response: 'made' } }
        [DynamicParam]: { [Endpoint]: { GET: { response: 'user' } } }
      }
    }
  }

  type Paths = Extract<TypedFetchInput<Materialised>, string>

  function request<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(
    _input: T & ValidFetchInput<Materialised, T, M>,
    _init?: TypedFetchRequestInit<Materialised, T, M> & { method?: M },
  ): TypedFetchResponseBody<Materialised, T, M>
  function request<T extends Paths, M extends HTTPMethod = 'GET'>(
    _input: T,
    _init?: TypedFetchRequestInit<Materialised, T, M> & { method?: M },
  ): TypedFetchResponseBody<Materialised, T, M>
  function request(_input: string, _init?: unknown): unknown {
    return undefined
  }

  it('accepts the same paths as the union it materialises', () => {
    expectTypeOf<'/api/health'>().toExtend<Paths>()
    expectTypeOf<`/api/users/${string}`>().toExtend<Paths>()
    expectTypeOf<'/api/nope'>().not.toExtend<Paths>()
  })

  it('resolves every call through the pair', () => {
    expectTypeOf(request('/api/health')).toEqualTypeOf<'ok'>()
    expectTypeOf(request('/api/users/1')).toEqualTypeOf<'user'>()
    expectTypeOf(request('/api/health?cache=0')).toEqualTypeOf<'ok'>()
    expectTypeOf(request('/api/users', { method: 'POST', body: { name: 'x' } })).toEqualTypeOf<'made'>()
    // @ts-expect-error no such path
    request('/api/nope')
  })
})

describe('request field accessors', () => {
  interface Fields {
    '/api/users': {
      [Endpoint]: {
        GET: { query?: { page: number }, response: 'list' }
        POST: { body: { name: string }, headers: { authorization: string }, response: 'made' }
      }
    }
  }

  it('resolves a declared field and falls back where none is declared', () => {
    expectTypeOf<TypedFetchRequestBody<Fields, '/api/users', 'POST'>>().toEqualTypeOf<{ name: string }>()
    expectTypeOf<TypedFetchRequestHeaders<Fields, '/api/users', 'POST'>>().toEqualTypeOf<{ authorization: string }>()
    expectTypeOf<TypedFetchRequestQuery<Fields, '/api/users', 'GET'>>().toEqualTypeOf<{ page: number } | undefined>()
    expectTypeOf<TypedFetchRequestBody<Fields, '/api/users', 'GET'>>().toEqualTypeOf<BodyInit | null>()
    expectTypeOf<TypedFetchRequestQuery<Fields, '/api/users', 'GET', never>>().toEqualTypeOf<{ page: number } | undefined>()
  })

  it('reports which fields are required', () => {
    expectTypeOf<TypedFetchRequires<Fields, '/api/users', 'POST', 'body'>>().toEqualTypeOf<true>()
    expectTypeOf<TypedFetchRequires<Fields, '/api/users', 'POST', 'query'>>().toEqualTypeOf<false>()
    expectTypeOf<TypedFetchRequires<Fields, '/api/users', 'GET', 'query'>>().toEqualTypeOf<false>()
  })

  it('falls back for a path that resolves to nothing, rather than resolving to never', () => {
    // `keyof never` carries every key, so without a guard the lookup succeeds and the field becomes
    // an option no value satisfies, and every field reports as required
    expectTypeOf<TypedFetchRequestBody<Fields, '/api/nope', 'POST'>>().toEqualTypeOf<BodyInit | null>()
    expectTypeOf<TypedFetchRequestBody<Fields, string, 'POST'>>().toEqualTypeOf<BodyInit | null>()
    expectTypeOf<TypedFetchRequestQuery<Fields, string>>().toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf<TypedFetchRequires<Fields, '/api/nope', 'POST', 'body'>>().toEqualTypeOf<false>()
    expectTypeOf<TypedFetchRequires<Fields, string, 'POST', 'body'>>().toEqualTypeOf<false>()
  })

  it('is extensible by an interface, which a whole init is not', () => {
    interface Options<T extends string, M extends HTTPMethod> {
      body?: TypedFetchRequestBody<Fields, T, M>
      query?: TypedFetchRequestQuery<Fields, T, M>
      headers?: TypedFetchRequestHeaders<Fields, T, M>
    }
    interface Extended<T extends string, M extends HTTPMethod> extends Options<T, M> {
      retries?: number
    }

    const options: Extended<'/api/users', 'POST'> = { body: { name: 'x' }, retries: 2 }
    expectTypeOf(options.body).toEqualTypeOf<{ name: string } | undefined>()
    expectTypeOf(options.retries).toEqualTypeOf<number | undefined>()
  })
})

describe('the completion signature of the pair', () => {
  interface Paired {
    '/api/health': { [Endpoint]: { GET: { response: 'ok' } } }
  }
  type Paths = Extract<TypedFetchInput<Paired>, string>

  // the union has no method, so constraining by it alone accepts a path the schema knows for a
  // method it does not answer
  function checked<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(input: T & ValidFetchInput<Paired, T, M>, init?: { method?: M }): TypedFetchResponseBody<Paired, T, M>
  function checked<T extends Paths, M extends HTTPMethod = 'GET'>(input: T & ValidFetchInput<Paired, T, M>, init?: { method?: M }): TypedFetchResponseBody<Paired, T, M>
  function checked(_input: string, _init?: unknown): unknown {
    return undefined
  }

  function unchecked<T extends AnyFetchPath, M extends HTTPMethod = 'GET'>(input: T & ValidFetchInput<Paired, T, M>, init?: { method?: M }): TypedFetchResponseBody<Paired, T, M>
  function unchecked<T extends Paths, M extends HTTPMethod = 'GET'>(input: T, init?: { method?: M }): TypedFetchResponseBody<Paired, T, M>
  function unchecked(_input: string, _init?: unknown): unknown {
    return undefined
  }

  it('rejects a method the path does not answer', () => {
    expectTypeOf(checked('/api/health')).toEqualTypeOf<'ok'>()
    // @ts-expect-error the endpoint registers no PUT
    checked('/api/health', { method: 'PUT' })
  })

  it('would otherwise resolve to never instead of rejecting', () => {
    expectTypeOf(unchecked('/api/health', { method: 'PUT' })).toBeNever()
  })
})

describe('an input that is not a path', () => {
  interface Fetchable {
    '/api/health': { [Endpoint]: { GET: { response: 'ok' } } }
  }
  type Paths = Extract<TypedFetchInput<Fetchable>, string>

  // `fetch` takes a `Request` or a `URL` as well as a path, so a client admitting them must be able
  // to put the validator on every signature without those inputs being rejected
  function request<T extends AnyFetchPath | Request | URL, M extends HTTPMethod = 'GET'>(
    _input: T & ValidFetchInput<Fetchable, T, M>,
    _init?: { method?: M, body?: TypedFetchRequestBody<Fetchable, T, M> },
  ): TypedFetchResponseBody<Fetchable, T, M>
  function request<T extends Paths | Request | URL, M extends HTTPMethod = 'GET'>(
    _input: T & ValidFetchInput<Fetchable, T, M>,
    _init?: { method?: M, body?: TypedFetchRequestBody<Fetchable, T, M> },
  ): TypedFetchResponseBody<Fetchable, T, M>
  function request(_input: unknown, _init?: unknown): unknown {
    return undefined
  }

  it('is accepted, and says nothing about the response', () => {
    expectTypeOf<ValidFetchInput<Fetchable, Request>>().toBeUnknown()
    expectTypeOf<ValidFetchInput<Fetchable, URL>>().toBeUnknown()
    expectTypeOf(request(new Request('https://example.com'))).toBeUnknown()
    expectTypeOf(request(new URL('https://example.com'))).toBeUnknown()
  })

  it('falls back for the request fields rather than making them never', () => {
    expectTypeOf<TypedFetchRequestBody<Fetchable, Request>>().toEqualTypeOf<BodyInit | null>()
    expectTypeOf<TypedFetchRequires<Fetchable, Request, 'GET', 'body'>>().toEqualTypeOf<false>()
  })

  it('still validates a path, and a method, on both signatures', () => {
    expectTypeOf(request('/api/health')).toEqualTypeOf<'ok'>()
    // @ts-expect-error the endpoint registers no PUT
    request('/api/health', { method: 'PUT' })
    // @ts-expect-error no such path
    request('/api/nope')
  })
})

describe('a key spanning several segments', () => {
  interface Combined {
    '/api/comments': { '/x': { [Endpoint]: { GET: { response: 'combined' } } } }
    [DynamicParam]: { '/x': { [Endpoint]: { GET: { response: 'param' } } } }
  }

  it('is matched by prefix, and not by a segment known only at runtime', () => {
    expectTypeOf<TypedFetchResponseBody<Combined, '/api/comments/x'>>().toEqualTypeOf<'combined'>()
    expectTypeOf<TypedFetchResponseBody<Combined, '/z/x'>>().toEqualTypeOf<'param'>()
    // a parameter consumes one segment, so a two-segment key is not one of the things it could be
    expectTypeOf<TypedFetchResponseBody<Combined, `/${string}/x`>>().toEqualTypeOf<'param'>()
  })
})

describe('telling a declared field from a fallback', () => {
  interface Guarded {
    '/api/guarded': { [Endpoint]: { GET: { headers: { 'x-token': string }, response: 1 } } }
    '/api/open': { [Endpoint]: { GET: { response: 2 } } }
  }

  // an endpoint declares the headers it requires, not the only ones a request may carry; `never` as
  // the fallback is what makes a declared shape distinguishable from an absent one
  type Declared<T extends string> = TypedFetchRequestHeaders<Guarded, T, 'GET', never>
  type Headers_<T extends string> = [Declared<T>] extends [never]
    ? Record<string, string>
    : Declared<T> & Record<string, string>

  function request<T extends string>(_input: T, _init?: { headers?: Headers_<T> }): void {}

  it('distinguishes a declared shape from nothing declared', () => {
    expectTypeOf<Declared<'/api/guarded'>>().toEqualTypeOf<{ 'x-token': string }>()
    expectTypeOf<Declared<'/api/open'>>().toBeNever()
  })

  it('lets a request carry headers beyond the declared ones', () => {
    expectTypeOf(request).toBeCallableWith('/api/guarded', { headers: { 'x-token': 't', 'x-extra': 'e' } })
    expectTypeOf(request).toBeCallableWith('/api/open', { headers: { anything: 'goes' } })
  })
})

describe('a metadata field declared as never', () => {
  interface Impossible {
    '/no-body': { [Endpoint]: { GET: { body: never, response: 1 } } }
  }

  interface CannotTell {
    '/opaque': { [Endpoint]: { GET: { body: unknown, response: 1 } } }
  }

  it('is not the same as a field declared as unknown, which is not required', () => {
    // `never` is "cannot be supplied", `unknown` is "cannot be typed": a generator whose extractor
    // gives up should emit the second, or omit the field
    expectTypeOf<TypedFetchRequires<CannotTell, '/opaque', 'GET', 'body'>>().toEqualTypeOf<false>()
    expectTypeOf<TypedFetchRequestBody<CannotTell, '/opaque', 'GET'>>().toBeUnknown()
    expectTypeOf<{ method?: 'GET' }>().toExtend<TypedFetchRequestInit<CannotTell, '/opaque', 'GET'>>()
  })

  it('counts as declared, so the field cannot be supplied', () => {
    // the reading a hand-written `body: never` wants, and the trap for a generator that emits an
    // extractor call for a handler validating nothing: the fallback is not reached
    expectTypeOf<TypedFetchRequestBody<Impossible, '/no-body', 'GET', { fallback: true }>>().toBeNever()
    expectTypeOf<TypedFetchRequestInit<Impossible, '/no-body', 'GET'>['body']>().toBeNever()
  })
})

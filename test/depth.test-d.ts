import type { HTTPMethod } from '../src/http'
import type { TypedFetchInput, TypedFetchMeta, TypedFetchRequestInit, TypedFetchResolvedMeta, TypedFetchResponseBody } from '../src/inference'
import type { DynamicParam, Endpoint, WildcardParam } from '../src/tree'
import type { GeneratedRoutes } from './fixture/generated'
import { describe, expectTypeOf, it } from 'vitest'

interface Depth1 {
  '/posts': { [DynamicParam]: { [Endpoint]: { GET: { response: 1 } } } }
}
interface CombinedFirstSegment {
  '/api/posts': { [DynamicParam]: { [Endpoint]: { GET: { response: 2 } } } }
}
interface StaticDepth2 {
  '/a': { '/b': { [Endpoint]: { GET: { response: 3 } } } }
}
interface StaticDepth3 {
  '/a': { '/b': { '/c': { [Endpoint]: { GET: { response: 4 } } } } }
}
interface StaticDepth4 {
  '/a': { '/b': { '/c': { '/d': { [Endpoint]: { GET: { response: 5 } } } } } }
}
interface DynamicDepth3 {
  '/api': { '/posts': { [DynamicParam]: { [Endpoint]: { GET: { response: 6 } } } } }
}
interface StaticAfterDynamic {
  '/api/users': { [DynamicParam]: { '/posts': { [Endpoint]: { GET: { response: 7 } } } } }
}
interface TwoDynamic {
  '/api/users': { [DynamicParam]: { '/posts': { [DynamicParam]: { [Endpoint]: { GET: { response: 8 } } } } } }
}
interface DeepWildcard {
  '/api': { '/files': { [WildcardParam]: { [Endpoint]: { GET: { response: 9 } } } } }
}

describe('nested route resolution', () => {
  it('resolves dynamic parameters at any depth', () => {
    expectTypeOf<TypedFetchResponseBody<Depth1, '/posts/x'>>().toEqualTypeOf<1>()
    expectTypeOf<TypedFetchResponseBody<CombinedFirstSegment, '/api/posts/x'>>().toEqualTypeOf<2>()
    expectTypeOf<TypedFetchResponseBody<DynamicDepth3, '/api/posts/x'>>().toEqualTypeOf<6>()
  })

  it('resolves static segments at any depth', () => {
    expectTypeOf<TypedFetchResponseBody<StaticDepth2, '/a/b'>>().toEqualTypeOf<3>()
    expectTypeOf<TypedFetchResponseBody<StaticDepth3, '/a/b/c'>>().toEqualTypeOf<4>()
    expectTypeOf<TypedFetchResponseBody<StaticDepth4, '/a/b/c/d'>>().toEqualTypeOf<5>()
  })

  it('resolves static segments following a dynamic parameter', () => {
    expectTypeOf<TypedFetchResponseBody<StaticAfterDynamic, '/api/users/123/posts'>>().toEqualTypeOf<7>()
    expectTypeOf<TypedFetchResponseBody<TwoDynamic, '/api/users/1/posts/2'>>().toEqualTypeOf<8>()
  })

  it('resolves wildcards at any depth', () => {
    expectTypeOf<TypedFetchResponseBody<DeepWildcard, '/api/files/a/b'>>().toEqualTypeOf<9>()
    expectTypeOf<TypedFetchResponseBody<DeepWildcard, '/api/files/a'>>().toEqualTypeOf<9>()
  })

  it('returns never for unmatched paths', () => {
    expectTypeOf<TypedFetchResponseBody<StaticDepth3, '/a/b'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<StaticDepth3, '/a/b/d'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<StaticAfterDynamic, '/api/users/123/comments'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<DeepWildcard, '/api/files/'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<DeepWildcard, '/api/filesystem'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<Depth1, '/posts/'>>().toBeNever()
    expectTypeOf<TypedFetchResponseBody<Depth1, '/postscript'>>().toBeNever()
  })

  it('lists nested paths as valid input', () => {
    expectTypeOf<'/a/b/c'>().toMatchTypeOf<TypedFetchInput<StaticDepth3>>()
    expectTypeOf<'/api/users/123/posts'>().toMatchTypeOf<TypedFetchInput<StaticAfterDynamic>>()
    expectTypeOf<'/api/users/1/posts/2'>().toMatchTypeOf<TypedFetchInput<TwoDynamic>>()
  })

  it('types request init for nested paths', () => {
    expectTypeOf<TypedFetchMeta<StaticDepth3, '/a/b/c'>['method']>().toEqualTypeOf<'GET'>()
    expectTypeOf<{ method: 'GET' }>().toMatchTypeOf<TypedFetchRequestInit<StaticDepth3, '/a/b/c'>>()
  })

  it('types request init for paths reached through a parameter', () => {
    expectTypeOf<TypedFetchResolvedMeta<StaticAfterDynamic, '/api/users/123/posts'>['method']>().toEqualTypeOf<'GET'>()
    expectTypeOf<TypedFetchResolvedMeta<DeepWildcard, '/api/files/a/b'>['method']>().toEqualTypeOf<'GET'>()

    // a parameterised path is only reached by the dynamic pass, so an exact-only lookup would leave
    // every property of the init `never` and make the options object impossible to satisfy
    expectTypeOf<TypedFetchRequestInit<StaticAfterDynamic, '/api/users/123/posts'>>().not.toBeNever()
    expectTypeOf<{ method: 'GET' }>().toMatchTypeOf<TypedFetchRequestInit<StaticAfterDynamic, '/api/users/123/posts'>>()
    expectTypeOf<{ method: 'GET' }>().toMatchTypeOf<TypedFetchRequestInit<DeepWildcard, '/api/files/a/b'>>()
    expectTypeOf<TypedFetchRequestInit<GeneratedRoutes, '/api/users/123'>['body']>().not.toBeNever()
  })
})

describe('serialized schema', () => {
  it('is resolvable by the inference types', () => {
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/health'>>().toEqualTypeOf<{ status: 'ok' }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/users'>>().toEqualTypeOf<{ id: number }[]>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/users', 'POST'>>().toEqualTypeOf<{ id: number }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/users/123'>>().toEqualTypeOf<{ id: number, name: string }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/users/123/posts'>>().toEqualTypeOf<{ title: string }[]>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/comments/1'>>().toEqualTypeOf<{ body: string }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/files/a/b.txt'>>().toEqualTypeOf<Blob>()
    expectTypeOf<TypedFetchMeta<GeneratedRoutes, '/api/users', 'POST'>['body']>().toEqualTypeOf<{ name: string }>()
  })
})

interface ReadmeSchema {
  '/api': {
    '/health': {
      [Endpoint]: { GET: { response: { status: 'ok' | 'error' } } }
    }
    '/users': {
      [Endpoint]: {
        GET: { response: { id: number }[] }
        POST: { body: { name: string }, response: { id: number } }
      }
      [DynamicParam]: {
        [Endpoint]: { GET: { response: { id: number } } }
        '/posts': {
          [Endpoint]: { GET: { response: { title: string }[] } }
          [DynamicParam]: {
            [Endpoint]: { GET: { response: { title: string } } }
          }
        }
      }
    }
  }
}

describe('documented mixed static and dynamic schema', () => {
  it('resolves every documented path', () => {
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/health'>>().toEqualTypeOf<{ status: 'ok' | 'error' }>()
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/users'>>().toEqualTypeOf<{ id: number }[]>()
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/users/123'>>().toEqualTypeOf<{ id: number }>()
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/users/123/posts'>>().toEqualTypeOf<{ title: string }[]>()
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/users/123/posts/456'>>().toEqualTypeOf<{ title: string }>()
    expectTypeOf<TypedFetchResponseBody<ReadmeSchema, '/api/users', 'POST'>>().toEqualTypeOf<{ id: number }>()
  })
})

interface AllMethods {
  '/api': {
    '/hello': {
      [Endpoint]: Record<HTTPMethod, { response: { hello: string } }>
    }
  }
}

describe('method-agnostic handlers', () => {
  it('resolves for every method', () => {
    expectTypeOf<TypedFetchResponseBody<AllMethods, '/api/hello'>>().toEqualTypeOf<{ hello: string }>()
    expectTypeOf<TypedFetchResponseBody<AllMethods, '/api/hello', 'PATCH'>>().toEqualTypeOf<{ hello: string }>()
  })

  it('resolves the serialized `ALL` form for every method', () => {
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/ping'>>().toEqualTypeOf<'pong'>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/ping', 'DELETE'>>().toEqualTypeOf<'pong'>()
    expectTypeOf<'/api/ping'>().toMatchTypeOf<TypedFetchInput<GeneratedRoutes>>()
  })

  it('prefers a specific method over the `ALL` form', () => {
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/search', 'POST'>>().toEqualTypeOf<{ results: string[], total: number }>()
    expectTypeOf<TypedFetchMeta<GeneratedRoutes, '/api/search', 'POST'>['body']>().toEqualTypeOf<{ query: string }>()

    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/search', 'GET'>>().toEqualTypeOf<{ results: string[] }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/search', 'PATCH'>>().toEqualTypeOf<{ results: string[] }>()
  })
})

interface Ambiguous {
  '/api/posts': {
    '/static': { [Endpoint]: { GET: { response: 'static' } } }
    '/other': { [Endpoint]: { GET: { response: 'other' } } }
    [DynamicParam]: { [Endpoint]: { GET: { response: 'param', ambiguousResponse: 'param' | 'static' | 'other' } } }
  }
}

interface AmbiguousAfterParam {
  '/api/users': {
    '/me': { '/posts': { [Endpoint]: { GET: { response: 'mine' } } } }
    [DynamicParam]: { '/posts': { [Endpoint]: { GET: { response: 'posts', ambiguousResponse: 'posts' | 'mine' } } } }
  }
}

interface AmbiguousWildcard {
  '/api/files': {
    [WildcardParam]: { [Endpoint]: { GET: { response: 'wild', ambiguousResponse: 'unused' } } }
  }
}

describe('requests whose segments are only known at runtime', () => {
  it('resolves the declared alternative for a non-literal segment', () => {
    expectTypeOf<TypedFetchResponseBody<Ambiguous, `/api/posts/${string}`>>().toEqualTypeOf<'param' | 'static' | 'other'>()
    expectTypeOf<TypedFetchResponseBody<AmbiguousAfterParam, `/api/users/${string}/posts`>>().toEqualTypeOf<'posts' | 'mine'>()
  })

  it('resolves a literal segment exactly', () => {
    expectTypeOf<TypedFetchResponseBody<Ambiguous, '/api/posts/123'>>().toEqualTypeOf<'param'>()
    expectTypeOf<TypedFetchResponseBody<Ambiguous, '/api/posts/static'>>().toEqualTypeOf<'static'>()
    expectTypeOf<TypedFetchResponseBody<AmbiguousAfterParam, '/api/users/123/posts'>>().toEqualTypeOf<'posts'>()
    expectTypeOf<TypedFetchResponseBody<AmbiguousAfterParam, '/api/users/me/posts'>>().toEqualTypeOf<'mine'>()
  })

  it('leaves a schema without an alternative untouched', () => {
    expectTypeOf<TypedFetchResponseBody<StaticAfterDynamic, `/api/users/${string}/posts`>>().toEqualTypeOf<7>()
    expectTypeOf<TypedFetchResponseBody<TwoDynamic, `/api/users/${string}/posts/${string}`>>().toEqualTypeOf<8>()
  })

  it('does not apply the alternative to a wildcard', () => {
    expectTypeOf<TypedFetchResponseBody<AmbiguousWildcard, '/api/files/a/b'>>().toEqualTypeOf<'wild'>()
    expectTypeOf<TypedFetchResponseBody<AmbiguousWildcard, `/api/files/${string}`>>().toEqualTypeOf<'wild'>()
  })

  it('keeps the alternative out of the metadata and the request init', () => {
    expectTypeOf<'ambiguousResponse' extends keyof TypedFetchMeta<Ambiguous, `/api/posts/${string}`, 'GET', 'dynamic'> ? true : false>().toEqualTypeOf<false>()
    expectTypeOf<TypedFetchMeta<Ambiguous, `/api/posts/${string}`, 'GET', 'dynamic'>['method']>().toEqualTypeOf<'GET'>()
    expectTypeOf<{ method: 'GET' }>().toMatchTypeOf<TypedFetchRequestInit<Ambiguous, `/api/posts/${string}`>>()
  })

  it('resolves the serialized form', () => {
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/comments/1'>>().toEqualTypeOf<{ body: string }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, '/api/comments/latest'>>().toEqualTypeOf<{ latest: true }>()
    expectTypeOf<TypedFetchResponseBody<GeneratedRoutes, `/api/comments/${string}`>>().toEqualTypeOf<{ body: string } | { latest: true }>()
  })
})

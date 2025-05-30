import type { DynamicParam, Endpoint, TypedFetchInput, TypedFetchResponse, WildcardParam } from 'fetchdts'

interface ExampleSchema {
  '/api': {
    '/test': {
      [Endpoint]: {
        POST: {
          body: { foo: string }
          response: { bar: string }
        }
      }
    }
    [DynamicParam]: {
      [Endpoint]: {
        GET: {
          body: { id: boolean }
          response: string
        }
      }
    }
  }
  'https://jsonplaceholder.typicode.com': {
    '/posts': {
      [Endpoint]: {
        GET: {
          body: never
          response: { id: number }
        }
        POST: {
          body: { id: number }
          response: null
        }
      }
      [DynamicParam]: {
        [Endpoint]: {
          GET: {
            body: { id: boolean }
            response: string
          }
        }
      }
    }
    [WildcardParam]: {
      [Endpoint]: {
        GET: {
          body: { id: boolean }
          response: string
        }
      }
    }
  }
}

async function typedFetch<T extends TypedFetchInput<ExampleSchema>>(_input: T) {
  return {} as Promise<TypedFetchResponse<ExampleSchema, T>>
}

const _res = await typedFetch('/api/foo')

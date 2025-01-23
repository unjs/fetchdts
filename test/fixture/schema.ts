import type { DynamicParam, Endpoint, WildcardParam } from '../../src/tree'

export interface ExampleSchema {
  '/methods': {
    '/get': {
      [Endpoint]: { GET: { response: { method: 'GET' } } }
    }
    '/post': {
      [Endpoint]: { POST: { response: { method: 'POST' } } }
    }
  }
  '/query': {
    '/required': {
      [Endpoint]: {
        POST: {
          query: { id: number }
          response: { type: 'query', method: 'POST' }
        }
      }
    }
    '/optional': {
      [Endpoint]: {
        POST: {
          query?: { id: number }
          response: { type: 'query', method: 'POST' }
        }
      }
    }
  }
  '/body': {
    '/required': {
      [Endpoint]: {
        POST: {
          body: { id: number }
          response: { type: 'body', method: 'POST' }
        }
      }
    }
    '/optional': {
      [Endpoint]: {
        POST: {
          body?: { id: number }
          response: { type: 'body', method: 'POST' }
        }
      }
    }
  }
  '/headers': {
    [Endpoint]: {
      POST: {
        response: { type: 'headers', method: 'POST' }
        headers: { authorization: string }
      }
    }
  }
  '/api': {
    '/static-options': {
      [Endpoint]: {
        OPTIONS: { response: { type: 'static', method: 'GET' } }
      }
    }
    '/static': {
      [Endpoint]: {
        POST: { response: { type: 'static', method: 'POST' } }
      }
    }
    [DynamicParam]: {
      [Endpoint]: {
        GET: { response: { type: 'dynamic', method: 'GET' } }
        POST: {
          body: { id: boolean }
          response: { type: 'dynamic', method: 'POST' }
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

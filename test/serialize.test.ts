import { describe, expect, it } from 'vitest'
import { DynamicParam, serializeRoutes } from '../src'
import generated from './fixture/generated.ts?raw'
import { routes } from './fixture/routes'

describe('serialize', () => {
  it('should serialize a route tree', () => {
    const tree = serializeRoutes('InternalRoutes', [
      {
        segments: ['/'],
        metadata: {
          GET: {
            responseType: '{ type: \'headers\', method: \'POST\' }',
            headersType: '{ authorization: \'string\' }',
          },
        },
      },
      {
        segments: ['/bob', DynamicParam],
        metadata: {
          POST: {
            responseType: '{ type: \'headers\', method: \'POST\' }',
            headersType: '{ authorization: \'string\' }',
          },
        },
      },
    ])

    expect(tree).toMatchInlineSnapshot(`
      "import type { DynamicParam, Endpoint } from 'fetchdts'

      interface InternalRoutes {
        "/": {
          [Endpoint]: {
            "GET": {
              "response": { type: 'headers', method: 'POST' }
              "headers": { authorization: 'string' }
            }
          }
        }
        "/bob": {
          [DynamicParam]: {
            [Endpoint]: {
              "POST": {
                "response": { type: 'headers', method: 'POST' }
                "headers": { authorization: 'string' }
              }
            }
          }
        }
      }"
    `)
  })

  it('should emit a schema the inference types can resolve', () => {
    expect(`${serializeRoutes('GeneratedRoutes', routes, { export: true })}\n`).toBe(generated)
  })

  it('should accept both segment spellings and normalise static segments', () => {
    const tree = serializeRoutes('InternalRoutes', [
      {
        segments: ['/users', DynamicParam, '/posts'],
        metadata: { GET: { responseType: 'Post[]' } },
      },
      {
        segments: [{ type: 'static', value: 'users' }, { type: 'dynamic' }],
        metadata: { GET: { responseType: 'User' } },
      },
      {
        segments: ['/files', { type: 'wildcard' }],
        metadata: { GET: { responseType: 'Blob' } },
      },
      {
        segments: ['https://api.example.com', '/status'],
        metadata: { GET: { responseType: 'Status' } },
      },
    ])

    expect(tree).toMatchInlineSnapshot(`
      "import type { DynamicParam, Endpoint, WildcardParam } from 'fetchdts'

      interface InternalRoutes {
        "/users": {
          [DynamicParam]: {
            "/posts": {
              [Endpoint]: {
                "GET": {
                  "response": Post[]
                }
              }
            }
            [Endpoint]: {
              "GET": {
                "response": User
              }
            }
          }
        }
        "/files": {
          [WildcardParam]: {
            [Endpoint]: {
              "GET": {
                "response": Blob
              }
            }
          }
        }
        "https://api.example.com": {
          "/status": {
            [Endpoint]: {
              "GET": {
                "response": Status
              }
            }
          }
        }
      }"
    `)
  })

  it('should union the types of routes that resolve to the same endpoint', () => {
    const tree = serializeRoutes('InternalRoutes', [
      { segments: ['/users', DynamicParam], metadata: { GET: { responseType: 'User' } } },
      { segments: ['/users', DynamicParam], metadata: { GET: { responseType: '(Post | Draft)[]' } } },
      { segments: ['/users', DynamicParam], metadata: { GET: { responseType: 'User' }, POST: { responseType: 'Created' } } },
    ])

    expect(tree).toMatchInlineSnapshot(`
      "import type { DynamicParam, Endpoint } from 'fetchdts'

      interface InternalRoutes {
        "/users": {
          [DynamicParam]: {
            [Endpoint]: {
              "GET": {
                "response": (User) | ((Post | Draft)[])
              }
              "POST": {
                "response": Created
              }
            }
          }
        }
      }"
    `)
  })
})

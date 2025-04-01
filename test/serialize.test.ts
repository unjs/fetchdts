import { describe, expect, it } from 'vitest'
import { serializeRoutes } from '../src'

describe('serialize', () => {
  it('should serialize a route tree', () => {
    const tree = serializeRoutes('InternalRoutes', [
      {
        path: '/',
        metadata: {
          GET: {
            responseType: '{ type: \'headers\', method: \'POST\' }',
            headersType: '{ authorization: \'string\' }',
          },
        },
      },
      {
        path: '/bob',
        type: 'dynamic',
        metadata: {
          POST: {
            responseType: '{ type: \'headers\', method: \'POST\' }',
            headersType: '{ authorization: \'string\' }',
          },
        },
      },
    ])

    expect(tree).toMatchInlineSnapshot(`
      "import { DynamicParam } from 'fetchdts'

      interface InternalRoutes {
        "/": {
          "GET": {
            "responseType": { type: 'headers', method: 'POST' }
            "headersType": { authorization: 'string' }
          }
        }
        "/bob": {
          [DynamicParam]: {
            "POST": {
              "responseType": { type: 'headers', method: 'POST' }
              "headersType": { authorization: 'string' }
            }
          }
        }
      }"
    `)
  })
})

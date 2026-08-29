import type { DynamicParam, Endpoint, HTTPMethod, WildcardParam } from 'fetchdts'

export interface GeneratedRoutes {
  "/api": {
    "/health": {
      [Endpoint]: {
        "GET": {
          "response": { status: 'ok' }
        }
      }
    }
    "/users": {
      [DynamicParam]: {
        "/posts": {
          [Endpoint]: {
            "GET": {
              "response": { title: string }[]
            }
          }
        }
        [Endpoint]: {
          "GET": {
            "response": { id: number, name: string }
          }
        }
      }
      [Endpoint]: {
        "GET": {
          "response": { id: number }[]
        }
        "POST": {
          "body": { name: string }
          "response": { id: number }
        }
      }
    }
    "/comments": {
      [DynamicParam]: {
        [Endpoint]: {
          "GET": {
            "response": { body: string }
          }
        }
      }
    }
    "/ping": {
      [Endpoint]: Record<HTTPMethod, {
        "response": 'pong'
      }>
    }
    "/search": {
      [Endpoint]: Record<Exclude<HTTPMethod, "POST">, {
        "response": { results: string[] }
      }> & {
        "POST": {
          "body": { query: string }
          "response": { results: string[], total: number }
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
  }
}

import type { DynamicParam, Endpoint, WildcardParam } from 'fetchdts'

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

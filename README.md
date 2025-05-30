# fetchdts

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> A suite of type utilities for building strongly-typed APIs

🚧 Under active development

- [▶️ &nbsp;Online playground](https://stackblitz.com/github/unjs/fetchdts/tree/main/playground)

## Features

- 💪 Strongly-typed query, body, headers, response.
- 🗺️ Static path segments, as well as dynamic and wildcard parameters.
- 📦 Exposes core utilities for building typed fetch functions.

## Usage

Install package:

```sh
# npm
npm install fetchdts

# pnpm
pnpm install fetchdts
```

## Quick Start

Define your API schema and create a strongly-typed fetch function:

```ts
import type { DynamicParam, Endpoint, TypedFetchInput, TypedFetchRequestInit, TypedFetchResponseBody, TypedResponse } from 'fetchdts'

// Define your API schema
interface APISchema {
  '/users': {
    [Endpoint]: {
      GET: {
        response: { id: number, name: string }[]
      }
      POST: {
        body: { name: string, email: string }
        response: { id: number, name: string, email: string }
      }
    }
    [DynamicParam]: { // /users/:id
      [Endpoint]: {
        GET: {
          response: { id: number, name: string, email: string }
        }
        DELETE: {
          response: { success: boolean }
        }
      }
    }
  }
}

// Create your typed fetch function
async function api<T extends TypedFetchInput<APISchema>>(
  input: T,
  init?: TypedFetchRequestInit<APISchema, T>,
) {
  return fetch(input, init as RequestInit) as unknown as Promise<TypedResponse<TypedFetchResponseBody<APISchema, T>>>
}

// Use with full type safety
const users = await api('/users').then(r => r.json()) // Type: { id: number; name: string }[]
const user = await api('/users/123').then(r => r.json()) // Type: { id: number; name: string; email: string }
```

## Core Concepts

### Schema Definition

Your API schema describes the structure of your endpoints using TypeScript interfaces:

```ts
interface Schema {
  '/path': {
    [Endpoint]: {
      [HTTPMethod]: {
        query?: { param: string } // Query parameters
        body?: { data: any } // Request body
        headers?: { auth: string } // Required headers
        response: { result: any } // Response data
        responseHeaders?: { 'x-rate-limit': string } // Response headers
      }
    }
  }
}
```

### Path Types

**Static Paths**: Exact string matches
```ts
interface Schema {
  '/api/users': {
    [Endpoint]: {
      GET: { response: User[] }
    }
  }
}
```

**Dynamic Parameters**: Single path segments
```ts
interface Schema {
  '/api/users': {
    [DynamicParam]: { // matches /api/users/123, /api/users/abc, etc.
      [Endpoint]: {
        GET: { response: User }
      }
    }
  }
}
```

**Wildcard Parameters**: Multiple path segments
```ts
interface Schema {
  '/api': {
    [WildcardParam]: { // matches /api/anything/nested/deep
      [Endpoint]: {
        GET: { response: any }
      }
    }
  }
}
```

### Symbols Reference

fetchdts uses special symbols to define different types of route matching:

```ts
import { DynamicParam, Endpoint, WildcardParam } from 'fetchdts'

interface Schema {
  // Endpoint: Marks where HTTP methods are defined
  [Endpoint]: {
    GET: { response: Data }
    POST: { body: Input, response: Data }
  }

  // DynamicParam: Matches single path segments (e.g., /users/:id)
  [DynamicParam]: {
    [Endpoint]: {
      GET: { response: User }
    }
  }

  // WildcardParam: Matches multiple path segments (e.g., /files/*)
  [WildcardParam]: {
    [Endpoint]: {
      GET: { response: File }
    }
  }
}
```

### HTTP Methods

All standard HTTP methods are supported:
- `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- `OPTIONS`, `HEAD`, `CONNECT`, `TRACE`

```ts
interface RESTSchema {
  '/api/users': {
    [Endpoint]: {
      GET: { response: User[] }
      POST: { body: CreateUser, response: User }
    }
    [DynamicParam]: {
      [Endpoint]: {
        GET: { response: User }
        PUT: { body: UpdateUser, response: User }
        PATCH: { body: Partial<UpdateUser>, response: User }
        DELETE: { response: { success: boolean } }
      }
    }
  }
}
```

## API Reference

### Core Types

#### `TypedFetchInput<Schema>`
Extracts valid URL paths from your schema:
```ts
type ValidPaths = TypedFetchInput<APISchema>
// Result: '/users' | '/users/${string}'
```

#### `TypedFetchRequestInit<Schema, Path>`
Provides typed request options for a specific path:
```ts
// For paths requiring body/headers/query parameters
await api('/users', {
  method: 'POST',
  body: { name: 'John' }, // ✅ Typed based on schema
  headers: { authorization: 'Bearer token' }
})
```

#### `TypedFetchResponseBody<Schema, Path>`
Returns the typed response body for a given path:
```ts
const response = await api('/users/123')
// Type automatically inferred from schema
```

#### `TypedHeaders<HeaderMap>`
Provides typed header access:
```ts
const contentType = response.headers.get('content-type') // string | null
const customHeader = response.headers.get('x-custom') // Typed based on schema
```

### Utilities

#### `serializeRoutes(name, routes, options?)`
Generate TypeScript schema from route definitions:

```ts
import { serializeRoutes } from 'fetchdts'

const schema = serializeRoutes('APISchema', [
  {
    path: '/users',
    metadata: {
      GET: {
        responseType: 'User[]'
      },
      POST: {
        bodyType: '{ name: string }',
        responseType: 'User'
      }
    }
  },
  {
    path: '/users/:id',
    type: 'dynamic',
    metadata: {
      GET: {
        responseType: 'User'
      }
    }
  }
])

console.log(schema)
// Outputs TypeScript interface definition
```

## Advanced Examples

### Typed Headers and Query Parameters

```ts
interface APISchema {
  '/search': {
    [Endpoint]: {
      GET: {
        query: { q: string, limit?: number }
        headers: { 'x-api-key': string }
        response: { results: string[], total: number }
        responseHeaders: { 'x-rate-limit-remaining': string }
      }
    }
  }
}

// Usage with required query and headers
const results = await api('/search', {
  query: { q: 'typescript', limit: 10 },
  headers: { 'x-api-key': 'your-key' }
})

// Access typed response headers
const rateLimit = results.headers.get('x-rate-limit-remaining') // string | null
```

### Mixed Static and Dynamic Routes

```ts
interface APISchema {
  '/api': {
    '/health': {
      [Endpoint]: {
        GET: { response: { status: 'ok' | 'error' } }
      }
    }
    '/users': {
      [Endpoint]: {
        GET: { response: User[] }
        POST: { body: CreateUser, response: User }
      }
      [DynamicParam]: {
        [Endpoint]: {
          GET: { response: User }
          PUT: { body: UpdateUser, response: User }
          DELETE: { response: { deleted: boolean } }
        }
        '/posts': {
          [Endpoint]: {
            GET: { response: Post[] }
          }
          [DynamicParam]: {
            [Endpoint]: {
              GET: { response: Post }
            }
          }
        }
      }
    }
  }
}

// All of these are now typed:
await api('/api/health') // { status: 'ok' | 'error' }
await api('/api/users') // User[]
await api('/api/users/123') // User
await api('/api/users/123/posts') // Post[]
await api('/api/users/123/posts/456') // Post
```

### Cross-Domain API Support

```ts
interface Schema {
  'https://api.github.com': {
    '/users': {
      [DynamicParam]: {
        [Endpoint]: {
          GET: { response: GitHubUser }
        }
        '/repos': {
          [Endpoint]: {
            GET: { response: Repository[] }
          }
        }
      }
    }
  }
}

// Works with full URLs
const user = await api('https://api.github.com/users/octocat')
const repos = await api('https://api.github.com/users/octocat/repos')
```

### Error Handling with Types

```ts
interface APISchema {
  '/api/users': {
    [DynamicParam]: {
      [Endpoint]: {
        GET: {
          response: User | { error: string, code: number }
        }
      }
    }
  }
}

const result = await api('/api/users/123')
// result is typed as: User | { error: string; code: number }

if ('error' in result) {
  console.error(`Error ${result.code}: ${result.error}`)
}
else {
  console.log(`User: ${result.name}`)
}
```

## Best Practices

### Schema Organization

For large APIs, consider organizing your schemas into modules:

```ts
// types/api.ts
interface UserAPI {
  '/api/users': {
    [Endpoint]: {
      GET: { response: User[] }
      POST: { body: CreateUser, response: User }
    }
    [DynamicParam]: {
      [Endpoint]: {
        GET: { response: User }
        PUT: { body: UpdateUser, response: User }
        DELETE: { response: { success: boolean } }
      }
    }
  }
}

interface PostAPI {
  '/api/posts': {
    [Endpoint]: {
      GET: { query?: { limit?: number }, response: Post[] }
      POST: { body: CreatePost, response: Post }
    }
    [DynamicParam]: {
      [Endpoint]: {
        GET: { response: Post }
        PUT: { body: UpdatePost, response: Post }
        DELETE: { response: { success: boolean } }
      }
    }
  }
}

// Combine them
type APISchema = UserAPI & PostAPI
```

### Runtime Validation

While fetchdts provides compile-time type safety, consider adding runtime validation:

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email()
})

async function api<T extends TypedFetchInput<APISchema>>(
  input: T,
  init?: TypedFetchRequestInit<APISchema, T>
): Promise<TypedFetchResponseBody<APISchema, T>> {
  const response = await fetch(input, init as RequestInit)
  const data = await response.json()

  // Runtime validation for critical endpoints
  if (input.startsWith('/api/users/') && init?.method !== 'DELETE') {
    return UserSchema.parse(data) // Throws if invalid
  }

  return data
}
```

### Error Handling

Design your schemas with error handling in mind:

```ts
interface APISchema {
  '/api/users': {
    [DynamicParam]: {
      [Endpoint]: {
        GET: {
          response:
            | { success: true, data: User }
            | { success: false, error: string, code: number }
        }
      }
    }
  }
}

// Usage
const result = await api('/api/users/123')
if (result.success) {
  console.log(result.data.name) // ✅ Type-safe access
}
else {
  console.error(`Error ${result.code}: ${result.error}`)
}
```

## Troubleshooting

### TypeScript Configuration

For the best experience, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## 💻 Development

I would welcome contributions! Please see the [Code of Conduct](./CODE_OF_CONDUCT.md).

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev` and type tests with `pnpm test:types`

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/fetchdts?style=flat-square
[npm-version-href]: https://npmjs.com/package/fetchdts
[npm-downloads-src]: https://img.shields.io/npm/dm/fetchdts?style=flat-square
[npm-downloads-href]: https://npm.chart.dev/fetchdts
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/fetchdts/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/unjs/fetchdts/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/fetchdts/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/fetchdts

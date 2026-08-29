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
    [DynamicParam]: { // matches /users/123
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

  // DynamicParam: Matches a single path segment (e.g. the `123` of /users/123)
  [DynamicParam]: {
    [Endpoint]: {
      GET: { response: User }
    }
  }

  // WildcardParam: Matches the rest of the path (e.g. the `a/b.txt` of /files/a/b.txt)
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

Generate a TypeScript schema from route definitions. Each route is a list of segments, already split:

```ts
import { DynamicParam, serializeRoutes } from 'fetchdts'

const schema = serializeRoutes('APISchema', [
  {
    segments: ['/users'],
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
    segments: ['/users', DynamicParam, '/posts'],
    metadata: {
      GET: {
        responseType: 'Post[]'
      }
    }
  }
])

console.log(schema)
// Outputs TypeScript interface definition
```

A segment is either static or a parameter:

| Segment | Meaning |
| --- | --- |
| `'/users'`, `'users'`, `{ type: 'static', value: 'users' }` | a static segment |
| `'https://api.example.com'` | an origin, for cross-domain schemas |
| `DynamicParam`, `{ type: 'dynamic' }` | exactly one segment |
| `WildcardParam`, `{ type: 'wildcard' }` | the rest of the path |

The object form exists so that tools which cannot pass symbols across a serialisation boundary can
still describe a route. Both forms produce identical output, and a static segment may itself contain
slashes (`'/api/users'`), which keeps the emitted tree shallower.

#### Converting route patterns

`fetchdts` does not parse route patterns. Every router spells a parameter differently, and the
schema only needs to know which segments are static, which match one segment, and which match the
rest, so the conversion belongs to whichever tool already owns your patterns.

If your patterns are [rou3](https://github.com/h3js/rou3) patterns, `routeNodeKeys` gives the
canonical form directly, and gives it to you from the router that will serve the request, so the
generated types cannot drift from the routing:

```ts
import { DynamicParam, serializeRoutes, WildcardParam } from 'fetchdts'
import { routeNodeKeys } from 'rou3'

const routes = endpoints.flatMap(({ pattern, method, responseType }) =>
  // one pattern can land on several nodes: `/users/:id?` -> ['/users', '/users/*']
  routeNodeKeys(pattern).map(key => ({
    segments: key.split('/').slice(1).map(segment =>
      segment === '*'
        ? DynamicParam
        : segment === '**'
          ? WildcardParam
          // escapes are preserved, so a literal `*` arrives as `\*`
          : segment.replace(/\\(.)/g, '$1'),
    ),
    // a handler with no method is valid for every verb
    metadata: { [method ?? 'ALL']: { responseType } },
  })),
)

const schema = serializeRoutes('APISchema', routes)
```

For filesystem routes, [`unrouting`](https://github.com/unjs/unrouting) parses the major conventions
and converts between them, reporting each lossy step rather than silently widening a pattern.

Constrained parameters collapse onto one node: `/users/:id(\d+)` and `/users/:slug([a-z]+)` share a
single dynamic segment in the schema, so their response types are unioned. Radix-tree routers group
them the same way and re-check the constraint per node, which a type cannot do.

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

### Handlers Registered for Every Method

A handler that is valid for every HTTP verb can be expressed compactly with `Record<HTTPMethod, ...>`:

```ts
interface APISchema {
  '/api': {
    '/hello': {
      [Endpoint]: Record<HTTPMethod, { response: { hello: string } }>
    }
  }
}
```

`serializeRoutes` emits that form for an `ALL` entry, which is worth using over spelling out every
method, as the generated file is several times smaller:

```ts
serializeRoutes('APISchema', [
  {
    segments: ['/api', '/hello'],
    metadata: {
      ALL: { responseType: '{ hello: string }' },
      // a specific method takes precedence over `ALL`
      POST: { bodyType: '{ name: string }', responseType: 'Created' }
    }
  }
])
```

### Registering a Route Without a Return Type

A route whose response type isn't known, because a handler couldn't be resolved or is a proxy, is
still a route, and should stay callable rather than looking like a typo. Register it for every method
with nothing else declared:

```ts
serializeRoutes('APISchema', [
  { segments: ['/api', '/proxy'], metadata: { ALL: {} } },
])

// [Endpoint]: Record<HTTPMethod, {}>
```

The path is then a valid input, takes any method, and its response is `unknown`. A path that matches
nothing, or a method an endpoint doesn't register, is still `never`, so the two cases stay
distinguishable:

```ts
type A = TypedFetchResponseBody<APISchema, '/api/proxy'> // unknown
type B = TypedFetchResponseBody<APISchema, '/api/typo'> // never
```

Omitting `metadata` entirely is not the same thing: it emits no endpoint at all, so the path is not
offered. That is deliberate, so that a generator which skips handlers it cannot type doesn't widen
its surface by accident.

### Requests Built From Runtime Values

`` $fetch(`/api/posts/${id}`) `` has the type `` `/api/posts/${string}` ``, so it matches the dynamic
parameter, but at runtime `id` could be `'static'` and hit a static sibling instead. By default the
dynamic parameter's response is used, which is exact for a literal path and optimistic for this one.

Where that matters, an endpoint can declare the response to use when the segment reaching it was not
a literal:

```ts
interface APISchema {
  '/api/posts': {
    '/static': { [Endpoint]: { GET: { response: Static } } }
    [DynamicParam]: {
      [Endpoint]: {
        GET: {
          response: Post
          ambiguousResponse: Post | Static
        }
      }
    }
  }
}

type A = TypedFetchResponseBody<APISchema, `/api/posts/${string}`> // Post | Static
type B = TypedFetchResponseBody<APISchema, '/api/posts/123'> // Post
type C = TypedFetchResponseBody<APISchema, '/api/posts/static'> // Static
```

The union is not computed for you, deliberately: which siblings a request could reach is a property
of the route set, and whoever generates the schema knows it, so computing it once at generation time
costs a fraction of deriving it at every call site. `serializeRoutes` emits an
`ambiguousResponseType` like any other metadata field. An endpoint that declares no
`ambiguousResponse` behaves exactly as before, so this is opt-in per endpoint.

The alternative is only used where a *parameter* consumed a non-literal segment. A wildcard is
unaffected, since it matches the rest of the path either way, and it applies to endpoints below the
parameter too, so `` `/api/users/${string}/posts` `` can account for a `/api/users/me/posts` sibling.

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

### Typing a Fetch Function

Keep the init type in *parameter* position, and make the method a type parameter if the response
needs to narrow by it:

```ts
declare function $fetch<T extends TypedFetchInput<Schema>, M extends HTTPMethod = 'GET'>(
  input: T,
  init?: TypedFetchRequestInit<Schema, T> & { method?: M },
): TypedFetchResponseBody<Schema, Trimmed<T>, M>
```

Constraining a type parameter to the init type instead looks equivalent, but is not:

```ts
// avoid: `Init` is constrained by every path in the schema
declare function $fetch<T extends TypedFetchInput<Schema>, Init extends TypedFetchRequestInit<Schema, T>>(
  input: T,
  init?: Init,
): TypedFetchResponseBody<Schema, Trimmed<T>, Init['method'] extends HTTPMethod ? Init['method'] : 'GET'>
```

The constraint is instantiated with `T` as the whole path union, so the request init is computed for
every route in the schema before a single call site is checked. On a schema of any size this
dominates everything else: the cost stops tracking the number of call sites and starts tracking the
number of routes, several times over. `pnpm bench --eager-init` measures the difference.

Two smaller notes on the same signature. An endpoint declares the headers it *requires*, so add
`{ headers?: Record<string, string> }` to the init if callers should be free to send others.
And if some paths only accept a method other than `GET`, a second overload constrained to
`TypedFetchInput<Schema, 'GET'>` with an optional init keeps those paths from being called without
one.

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

[npm-version-src]: https://npmx.dev/api/registry/badge/version/fetchdts
[npm-version-href]: https://npmx.dev/package/fetchdts
[npm-downloads-src]: https://npmx.dev/api/registry/badge/downloads/fetchdts
[npm-downloads-href]: https://npm.chart.dev/fetchdts
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/fetchdts/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/unjs/fetchdts/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/fetchdts/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/fetchdts

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

**Wildcard Parameters**: Zero or more path segments
```ts
interface Schema {
  '/api': {
    [WildcardParam]: { // matches /api, /api/anything, /api/nested/deep
      [Endpoint]: {
        GET: { response: any }
      }
    }
  }
}
```

**Matching order**: a static segment is preferred to a dynamic parameter, and a dynamic parameter to
a wildcard, as in a router. Where the more specific match does not answer the method being
requested, the less specific one is used, so a `POST`-only static route and a `GET` wildcard sibling
are both reachable at the same path:

```ts
interface Schema {
  '/api/blog': {
    '/thing': { [Endpoint]: { POST: { response: D } } }
    [WildcardParam]: { [Endpoint]: { GET: { response: C } } }
  }
}

type A = TypedFetchResponseBody<Schema, '/api/blog/thing', 'POST'> // D
type B = TypedFetchResponseBody<Schema, '/api/blog/thing', 'GET'> // C
```

A query string, a fragment and a trailing slash are ignored when a path is resolved, so
`'/api/users?page=2'` resolves as `'/api/users'` does.

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

  // WildcardParam: Matches the rest of the path, which may be empty (e.g. the `a/b.txt` of /files/a/b.txt)
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

Methods may be written in either case (`'POST'` or `'post'`), as a router compares them
case-insensitively. A route registered for `GET` also answers `HEAD`, as it does in h3, which serves
the `GET` handler and discards the body; an endpoint that registers `HEAD` itself is used in
preference.

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

#### `AnyFetchPath`

The shape any path may take, for use as the constraint of the type parameter a path is inferred into:

```ts
declare function $fetch<T extends AnyFetchPath>(input: T /* ... */): unknown
```

Constrain to this rather than to `string`, which loses the path of `useFetch(ref('/api/users'))`:
`ref()` and `computed()` infer their own type parameter from the argument, and a literal widens where
the type it is inferred into is constrained by `string` and keeps its literal type where the
constraint is a pattern. A direct literal, a getter and a pre-declared `Ref<'/api/users'>` are
unaffected either way, and a union of paths has the same effect as a pattern, so a signature
constrained to `TypedFetchInput<Schema>` does not need this as well.

#### `ValidFetchInput<Schema, Path, Method?>`

Whether a path resolves, for use in parameter position:

```ts
declare function $fetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
  input: T & ValidFetchInput<Schema, T, M>,
  init?: TypedFetchRequestInit<Schema, T, M> & { method?: M },
): TypedFetchResponseBody<Schema, T, M>
```

This is an alternative to constraining the input with `TypedFetchInput`, which materialises the
union of every path in the schema. Validating one path costs no more than its depth, where checking
a union costs the size of the schema, so on a large generated schema this is substantially cheaper:
at 1500 routes and 200 call sites it checks in around 0.4s where the union takes around 3s
(`pnpm bench --routes 1500 --calls 200 [--valid-input]`). It accepts a query string or a fragment
without enumerating either, and narrows by method.

A path that resolves gives `unknown`, which leaves the parameter as `T`. One that does not gives a
type no string satisfies, whose single key carries the reason, so the failure reads as:

```text
Argument of type '"/api/nope"' is not assignable to parameter of type
  '"/api/nope" & { "fetchdts: no GET route matches '/api/nope'": never }'
```

The text is a diagnostic rather than API, and may change.

Put it on *every* signature that admits a path, including one already constrained by
`TypedFetchInput`: the union carries no method, so a signature constrained by it alone accepts a path
the schema knows for a method that path does not answer.

An input that is not a path, such as a `Request` or a `URL`, which `fetch` also takes, carries nothing to
check and is accepted, so a client admitting them can validate every signature without rejecting
them.

Every member of a union of paths must resolve, so a value narrowed to one of several paths cannot
pass on the strength of one of them. A path known only to be a `string` matches nothing and is
rejected; if callers should be able to request an arbitrary path, add a signature taking `string` and
returning `unknown`, so that the escape hatch is explicit.

The trade-off is completion: a validator has no literals for an editor to offer, so put the union in
the constraint alongside it, as [Typing a Fetch Function](#typing-a-fetch-function) shows.

#### `TypedFetchRequestInit<Schema, Path, Method?>`
Provides typed request options for a specific path:
```ts
// For paths requiring body/headers/query parameters
await api('/users', {
  method: 'POST',
  body: { name: 'John' }, // ✅ Typed based on schema
  headers: { authorization: 'Bearer token' }
})
```

Pass `Method` where it is known. The methods a path answers depend on it, since a path may reach one
endpoint for one method and a different one for another, so a method-agnostic init describes only
what every reachable endpoint has in common:

```ts
type A = TypedFetchRequestInit<Schema, '/users', 'POST'>['body'] // { name: string }
type B = TypedFetchRequestInit<Schema, '/users'>['body'] // BodyInit | null | undefined
```

#### `TypedFetchResponseBody<Schema, Path>`
Returns the typed response body for a given path:
```ts
const response = await api('/users/123')
// Type automatically inferred from schema
```

#### `TypedFetchMethods<Schema, Path>`

The methods a path answers, or every method where it resolves to nothing. Constrain a signature's
method parameter with it (`method?: M & TypedFetchMethods<Schema, T>`) to reject a method the path
does not answer, which a path union cannot express on its own.

#### `TypedFetchRequestBody` / `TypedFetchRequestQuery` / `TypedFetchRequestHeaders` / `TypedFetchRequires`

The shape an endpoint declares for one field of the request, or a fallback where it declares none,
plus whether the field is required.

Use these instead of `TypedFetchRequestInit` where the options type has to be *extensible*. A whole
init is built from conditionals, and an interface may only extend a type whose members are statically
known, so `interface Options<T> extends Omit<TypedFetchRequestInit<Schema, T>, 'method'>` does not
compile (`TS2312`) as soon as the path is generic. Writing the keys out avoids it:

```ts
interface Options<Path extends string, Method extends AnyHTTPMethod> {
  body?: TypedFetchRequestBody<Schema, Path, Method>
  query?: TypedFetchRequestQuery<Schema, Path, Method>
  headers?: TypedFetchRequestHeaders<Schema, Path, Method>
}

// and a consumer of yours can extend it
interface MyOptions<Path extends string, Method extends AnyHTTPMethod> extends Options<Path, Method> {
  retries?: number
}
```

`TypedFetchRequires<Schema, Path, Method, 'body' | 'query' | 'headers'>` reports whether a field is
required, for making the corresponding member required at a call signature.

Pass `never` as the fallback where you need to tell "the endpoint declared this" from "it did not".
That is what lets a client widen only the declared case, which is what request headers want: an
endpoint declares the headers it *requires*, not the only ones a request may carry.

```ts
type Declared<Path extends string, Method extends AnyHTTPMethod> = TypedFetchRequestHeaders<Schema, Path, Method, never>

type Headers<Path extends string, Method extends AnyHTTPMethod> = [Declared<Path, Method>] extends [never]
  ? Record<string, string>
  : Declared<Path, Method> & Record<string, string>
```

The declared header stays required and typed, and a request may carry others. The same shape applies
to `query` for an endpoint that declares one but should still accept more.

A field declared as `never` counts as declared, and means the field cannot be supplied: the fallback
is not reached and the option resolves to `never`. That is the intended reading for a hand-written
`body: never`, and a trap for a generator that emits an extractor call per field rather than deciding
whether one applies: `queryType: QueryOf<typeof handler>` on a handler that validates nothing
resolves to `never`, and the endpoint then has an option no value satisfies rather than an open one.
Omit the field instead, or, where the generator cannot tell, ask with `never` as the fallback and
treat that as undeclared, as above.

A field declared as `unknown` is the other case: not "cannot be supplied" but "cannot be typed". It is
never required, and the option accepts anything, so it is the right thing for a generator to emit
where its extractor gives up.

An extractor written as a conditional over a naked type parameter reaches `never` more often than its
author expects, since such a conditional distributes and short-circuits: one that cannot read a
handler yields `never`, which then reads here as "cannot be supplied" rather than as the fallback the
author had in mind. Guard the entry point with `[T] extends [never]`, and prefer omitting a field to
emitting an extractor call that can fail.

A path that resolves to nothing, including one known only to be a `string`, falls back on every field
and requires none of them, so a client that accepts an opaque path still has usable options. The
response and error accessors differ deliberately: they resolve to `never` for such a path, since
there is no response to describe, and to `unknown` for a `Request` or a `URL`, which are accepted
inputs carrying no path to resolve.

#### `TypedHeaders<HeaderMap>`
Provides typed header access:
```ts
const contentType = response.headers.get('content-type') // string | null
const customHeader = response.headers.get('x-custom') // Typed based on schema
```

#### `LooseTypedHeaders<HeaderMap>` / `LooseTypedRequest<Body, HeaderMap>`

Variants that type header *names* but leave every value as `string`. Use them when the header map is
not known where the type is declared, such as when it comes from a generic parameter of your own
type:

```ts
interface MyRequest<HeaderMap extends Record<string, string>> {
  headers: LooseTypedHeaders<HeaderMap>
}
```

`TypedHeaders` resolves each value with a conditional lookup into the map, which TypeScript cannot
reduce while the map is still generic, so a plain `Headers` is neither assignable to nor from
`TypedHeaders<HeaderMap>` in that position.

### Utilities

#### `compileRoutes(sets, options?)` from `fetchdts/compiler`

Compile route sets into a module of types specialised to them. Each route is a list of segments,
already split; `fetchdts` does not parse route patterns.

```ts
import { compileRoutes } from 'fetchdts/compiler'

const { code, strategy, stats } = compileRoutes([
  { routes: serverRoutes },
  { routes: externalRoutes, origin: 'https://api.example.com' },
], { name: 'ServerRoutes', moduleSpecifier: 'nuxt/app' })
```

`imports` on the result lists the names the emitted module imports, so a consumer re-exporting them
from its own entry can assert it covers them. An import the specifier does not provide resolves to
`any` rather than failing, because `skipLibCheck` suppresses the error in a declaration file, and
every type built on it then accepts anything.

The emitted module exports the route tree, an exact-match table where one is worth emitting, the path
union, and accessors specialised to the route set: `ValidInput`, `Response`, `ResponseHeaders`,
`ErrorBody`, `RequestBody`, `RequestQuery`, `RequestHeaders` and `Requires`. A consumer's signatures
then name only the emitted types and `AnyFetchPath`, so how a path is resolved is free to change
between versions of `fetchdts` without changing the signatures a consumer writes, since regenerating is
enough.

An artefact left behind by an upgrade fails to compile, because the emitted module imports the type
names it uses. That holds only where the name changed, so an emitted-surface type is renamed whenever
its meaning changes rather than quietly resolving to something else.

Where a consumer's route map can be extended by hand, pass `resolveAgainst` with the name of an
interface extending the emitted one:

```ts
// generated.ts, emitted with { name: 'GeneratedRoutes', resolveAgainst: 'ServerRoutes' }
// routes.ts
export interface ServerRoutes extends GeneratedRoutes {}
```

The accessors then resolve against `ServerRoutes`, so a route someone adds by augmenting it is found,
while every path known at generation time still short-circuits through the exact-match table.
Without this the accessors are bound to the emitted interface, and an augmentation, which targets
the consumer's own interface, is invisible to them, so a hand-added route reads as a typo. Pass any
imports the emitted module needs for that name, or for types its metadata references, as `imports`.

Every strategy emits the same names. Which one is chosen depends on the route set: an exact-match
table is emitted for any static path, since a lookup replaces a walk, and the path union while the
paths reached through a parameter are few enough for it to stay cheap (`unionLimit`, 200 by default).
`strategy` in the result and a comment at the head of the module record what was chosen and the counts
that chose it; pass `strategy` to force one.

A type a route's handler cannot give up belongs in that route's metadata, not in an augmentation of
the emitted module: an override reaches the table and the union, so it is offered as a completion,
where a merged route reaches neither.

Method names are uppercased, as a router compares them case-insensitively, and a route with no
segments is emitted as `'/'`.

Route segments, method names and metadata fields come from whatever generated them, so every lookup
table built from them has a null prototype, a metadata value that is not a string is skipped, and an
interface name, a module specifier or a segment the compiler cannot emit is a `TypeError` rather than
invalid output. A static segment is also escaped where it lands inside an emitted template literal
type.

```ts
import { DynamicParam } from 'fetchdts'
import { compileRoutes } from 'fetchdts/compiler'

const { code } = compileRoutes([{ routes: [
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
] }], { name: 'APISchema' })

console.log(code)
// Outputs the generated module
```

A segment is either static or a parameter:

| Segment | Meaning |
| --- | --- |
| `'/users'`, `'users'`, `{ type: 'static', value: 'users' }` | a static segment |
| `'https://api.example.com'` | an origin, for cross-domain schemas |
| `DynamicParam`, `{ type: 'dynamic' }` | exactly one segment |
| `WildcardParam`, `{ type: 'wildcard' }` | the rest of the path, which may be empty; nothing may follow it |

A static segment spanning several path segments is split into one key per segment, and an origin is
kept whole. A path is resolved by looking up a single segment as a key, so one key per segment is the
shape that keeps resolution independent of how many routes a node holds; a key spanning several is
still matched, by scanning the node's keys.

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
import { DynamicParam, WildcardParam } from 'fetchdts'
import { compileRoutes } from 'fetchdts/compiler'
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

const { code } = compileRoutes([{ routes }], { name: 'APISchema' })
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

`compileRoutes` emits that form for an `ALL` entry, which is worth using over spelling out every
method, as the generated file is several times smaller:

```ts
compileRoutes([{ routes: [
  {
    segments: ['/api', '/hello'],
    metadata: {
      ALL: { responseType: '{ hello: string }' },
      // a specific method takes precedence over `ALL`
      POST: { bodyType: '{ name: string }', responseType: 'Created' }
    }
  }
] }])
```

### Registering a Route Without a Return Type

A route whose response type isn't known, because a handler couldn't be resolved or is a proxy, is
still a route, and should stay callable rather than looking like a typo. Register it for every method
with nothing else declared:

```ts
compileRoutes([{ routes: [
  { segments: ['/api', '/proxy'], metadata: { ALL: {} } },
] }])

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
parameter, but at runtime `id` could be `'static'` and hit a static sibling instead. A segment that
is not known in full reaches every branch it could take, so the response is the union of them:

```ts
interface APISchema {
  '/api/posts': {
    '/static': { [Endpoint]: { GET: { response: Static } } }
    [DynamicParam]: { [Endpoint]: { GET: { response: Post } } }
  }
}

type A = TypedFetchResponseBody<APISchema, `/api/posts/${string}`> // Post | Static
type B = TypedFetchResponseBody<APISchema, '/api/posts/123'> // Post
type C = TypedFetchResponseBody<APISchema, '/api/posts/static'> // Static
```

This holds for a segment that is only partly known (`` `/api/posts/item-${string}` `` reaches
`/api/posts/item-1` and the parameter, but no other sibling), and for endpoints below the segment, so
`` `/api/users/${string}/posts` `` accounts for a `/api/users/me/posts` sibling.

A static key spanning several segments (`'/api/users'` written as a single key) is matched by prefix
only, so a partly known segment does not reach it.

Where the union should be something other than what the schema implies, an endpoint can declare the
response to use when the segment reaching it was not a literal, which takes precedence:

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

`compileRoutes` carries an `ambiguousResponseType` like any other metadata field, so a generator that
already knows the union can declare it rather than have it derived. The declared response is used
only where a *parameter* consumed a non-literal segment; a wildcard is unaffected, since it matches
the rest of the path either way.

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

Constrain the path by the union, keep the path parameter itself plain, and constrain the *method* by
what that path answers:

```ts
declare function $fetch<T extends Paths, M extends AnyHTTPMethod = 'GET'>(
  input: T,
  init?: TypedFetchRequestInit<Schema, T, M> & { method?: M & TypedFetchMethods<Schema, T> },
): TypedFetchResponseBody<Schema, T, M>
declare function $fetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
  input: T & ValidFetchInput<Schema, T, M>,
  init?: TypedFetchRequestInit<Schema, T, M> & { method?: M },
): TypedFetchResponseBody<Schema, T, M>
```

The first signature answers a path the union covers: the union gives an editor its completions, and
the plain parameter is what lets `` `/api/users/${id}` `` infer as a template literal type. The second
takes what the union cannot express (a query string, a fragment, a trailing slash, a `Request` or a
`URL`) and validates it.

Three things have to be true at once and they pull against each other, so the shape is worth
understanding rather than copying:

| wanted | needs |
| --- | --- |
| completions from `` $fetch(' `` | the union in the constraint of the *first* signature |
| `` `/api/users/${id}` `` to resolve | the path parameter **not** intersected with anything |
| a method the path does not answer to be rejected | the method constrained, since a path union carries no method |

Intersecting the validator onto the path parameter satisfies the third and breaks the second: a
template literal argument stops inferring as a template literal type and arrives as `string`, so the
call resolves to `unknown` or is rejected outright. Constraining the method with
`TypedFetchMethods<Schema, T>` closes the same hole without touching the path.

Note the method is constrained on the init *member* (`method?: M & TypedFetchMethods<Schema, T>`)
rather than on the type parameter. Constraining the parameter itself would make the `= 'GET'` default
illegal, and it is the same rule as [never constraining a type parameter by a type computed from the
route map](#typedfetchinputschema).

If your signature also lets a caller override the response type, widen the method's default when they
do. Naming any type argument turns inference off for the rest, so `$fetch<Foo>(url, { method: 'post' })`
would otherwise fall back to `'GET'` and reject the method:

```ts
declare function $fetch<
  R = void,
  T extends Paths = Paths,
  M extends AnyHTTPMethod = R extends void ? 'GET' : AnyHTTPMethod,
>(input: T, init?: { method?: M & TypedFetchMethods<Schema, T> }): R extends void ? TypedFetchResponseBody<Schema, T, M> : R
```

Once the caller has named the response, the method no longer decides what comes back, so widening the
default costs nothing.

The init belongs in *parameter* position, and the method is worth passing to it as well as to the
response: it is otherwise resolved for every method the path answers, and describes only what they
have in common. Constrain the method parameter by `AnyHTTPMethod` rather than `HTTPMethod`, or
`method: 'post'` fails to infer and the call is rejected for a method the endpoint answers.

The union in the constraint is compared against the requested path at every call site, so that part
of checking tracks the size of the schema; validation walks it instead, which costs the depth of one
path. That is the whole of the difference between the three figures above.

Constraining a type parameter to the init type instead looks equivalent, but is not:

```ts
// avoid: `Init` is constrained by every path in the schema
declare function $fetch<T extends TypedFetchInput<Schema>, Init extends TypedFetchRequestInit<Schema, T>>(
  input: T,
  init?: Init,
): TypedFetchResponseBody<Schema, T, Init['method'] extends HTTPMethod ? Init['method'] : 'GET'>
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

### Wrapping the Fetch Function in a Composable

Where the path arrives wrapped, as it does in a composable taking a ref or a getter, intersect the
validator with the *whole* parameter rather than with the path inside it:

```ts
declare function useFetch<T extends AnyFetchPath, M extends AnyHTTPMethod = 'GET'>(
  url: MaybeRefOrGetter<T> & ValidFetchInput<Schema, T, M>,
  options?: UseFetchOptions<Schema, T, M> & TypedFetchRequestInit<Schema, T, M> & { method?: M },
): { data: Ref<TypedFetchResponseBody<Schema, T, M> | null> }
```

TypeScript cannot infer through an intersection, so
`MaybeRefOrGetter<T & ValidFetchInput<Schema, T, M>>` leaves `T` at its constraint and every path
resolves to nothing. Intersected at the top level, `T` is still inferred from the ref or the getter,
and the failure still reports on the `url` argument.

Options that narrow the response, as `transform` and `pick` do, layer on top: resolve the response
once with `TypedFetchResponseBody` and let the further type parameters default from it, since the
path and method are already resolved by the time they are read.

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

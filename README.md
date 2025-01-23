# fetchdts

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Github Actions][github-actions-src]][github-actions-href]
[![Codecov][codecov-src]][codecov-href]

> A suite of type utilities for building strongly-typed APIs

🚧 Under active development

- [▶️ &nbsp;Online playground](https://stackblitz.com/github/danielroe/fetchdts/tree/main/playground)

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

```ts
import type { DynamicParam, Endpoint, TypedFetchInput, TypedFetchResponse, WildcardParam } from 'fetchdts'

interface Schema {
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
}

async function typedFetch<T extends TypedFetchInput<Schema>>(_input: T) {
  return {} as Promise<TypedFetchResponse<Schema, T>>
}

const _res = await typedFetch('/api/foo')
// typed as string
```

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable`
- Install dependencies using `pnpm install`
- Run interactive tests using `pnpm dev`

## License

Made with ❤️

Published under [MIT License](./LICENCE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/fetchdtsstyle=flat-square
[npm-version-href]: https://npmjs.com/package/fetchdts
[npm-downloads-src]: https://img.shields.io/npm/dm/fetchdtsstyle=flat-square
[npm-downloads-href]: https://npm.chart.dev/fetchdts
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/danielroe/fetchdts/ci.yml?branch=main&style=flat-square
[github-actions-href]: https://github.com/danielroe/fetchdts/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/danielroe/fetchdts/main?style=flat-square
[codecov-href]: https://codecov.io/gh/danielroe/fetchdts

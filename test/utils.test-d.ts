// import type { TypedFetchMeta } from '../src/inference'
// import type { Endpoint } from '../src/tree'

// import { describe, expectTypeOf, it } from 'vitest'
// import { createFetch } from '../src/utils'

// interface Schema {
//   'https://test.com': {
//     '/auth': {
//       '/get': {
//         [Endpoint]: {
//           GET: {
//             response: { id: number }
//             headers: { authorization: 'foo' | 'bar' }
//           }
//         }
//       }
//     }
//     '/posts': {
//       [Endpoint]: {
//         GET: { response: { id: number } }
//       }
//     }
//   }
// }

// describe('typed native fetch API', () => {
//   const fetch = createFetch<Schema>()

//   it('types response', async () => {
//     type D = TypedFetchMeta<Schema, 'https://test.com/posts'>
//     const a = await fetch('https://test.com/posts').then(r => r.json())
//     expectTypeOf(a).toEqualTypeOf<{ id: number }>()
//   })

//   it('types headers', async () => {
//     // @ts-expect-error missing authorization header
//     await fetch('https://test.com/auth/get')

//     // @ts-expect-error incorrect authorization header
//     await fetch('https://test.com/auth/get', {
//       // method: 'GET',
//       headers: { authorization: 'a' },
//     })

//     fetch('https://test.com/auth/get').then(r => r.json())

//     const a = await fetch('https://test.com/auth/get', {
//       method: 'GET',
//       headers: { authorization: 'foo' },
//     }).then(r => r.json())

//     expectTypeOf(a).toEqualTypeOf<{ id: number }>()
//   })
// })

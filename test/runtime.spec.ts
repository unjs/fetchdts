import { describe, expect, it } from 'vitest'
import { Endpoint, serializeFetchSchema } from '../src/runtime'

describe('runtime schema generation', () => {
  it('should generate types for fetch schema', async () => {
    const schema = serializeFetchSchema({
      name: 'MySchema',
      schema: {
        '/methods': {
          '/get': {
            [Endpoint]: { GET: { response: { method: 'GET' } } },
          },
          '/post': {
            [Endpoint]: { POST: { response: { method: 'POST' } } },
          },
        },
      },
    })

    await expect(`${schema.imports}\n${schema.declaration}`).toMatchFileSnapshot('snapshots/schema.d.ts')
  })
})

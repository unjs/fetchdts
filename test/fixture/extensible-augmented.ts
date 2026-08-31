import type { DynamicParam, Endpoint } from '../../src/tree'

declare module './extensible' {
  interface ExtensibleRoutes {
    '/api/by-hand': {
      [Endpoint]: { GET: { response: { byHand: true } } }
      [DynamicParam]: { [Endpoint]: { GET: { response: { byHand: 'param' } } } }
    }
  }
}

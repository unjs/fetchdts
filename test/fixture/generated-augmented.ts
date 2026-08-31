import type { DynamicParam, Endpoint } from '../../src/tree'

// A route merged into the generated module. This is *not* a supported feature: the compiler knows
// every route at build time, and a route it could not type should be given a type through the route's
// metadata rather than merged in afterwards.
//
// The test using this documents a coupling: it passes only because the tree is emitted as an
// interface, the accessors read it by name, and the table falls through. If anyone inlines a resolved
// copy of the tree into the accessors for speed, this is what fails, and that is the moment to decide
// whether the coupling was worth keeping.
declare module './generated' {
  interface GeneratedRoutes {
    '/api/added': {
      [Endpoint]: { GET: { response: { added: true } } }
      [DynamicParam]: { [Endpoint]: { GET: { response: { added: 'param' } } } }
    }
  }
}

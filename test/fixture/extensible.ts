import type { CompiledRoutes } from './generated-extensible'

/**
 * The interface a consumer augments, extending what the compiler emitted. The emitted accessors
 * resolve against this, so a route added by hand is found by the walk behind the exact-match table.
 */
export interface ExtensibleRoutes extends CompiledRoutes {}

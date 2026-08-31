import type { HTTPMethod } from './http'
import type { DynamicParam, Endpoint, StaticParam, WildcardParam } from './tree'
import type { RespectOptionality, Trimmed } from './utils'

/** A method in either case, as a router compares them case-insensitively. */
export type AnyHTTPMethod = HTTPMethod | Lowercase<HTTPMethod>

/** The uppercase form of a method, leaving the method-agnostic `''` alone. */
type NormalizeMethod<Method extends AnyHTTPMethod | ''> = Method extends '' ? '' : Uppercase<Method>

/** Whether an endpoint answers `Method`. A `GET` route also answers `HEAD`, as in a router. */
type HasMethod<Endpoints, Method extends HTTPMethod | ''> = Method extends keyof Endpoints
  ? true
  : Method extends 'HEAD'
    ? 'GET' extends keyof Endpoints ? true : false
    : false

/**
 * The shape any path may take, for constraining the parameter a path is inferred into.
 *
 * A pattern rather than `string`: a literal inferred into a parameter constrained by `string` widens,
 * and keeps its literal type where the constraint is a pattern.
 */
export type AnyFetchPath = `/${string}` | `${string}://${string}`

/**
 * Every path in `Schema`, optionally narrowed to those answering `Method`.
 *
 * Materialise it before using it as a constraint (`Extract<TypedFetchInput<Schema>, string>`), or a
 * union holding template literal members is re-instantiated at every call site. Applying `Extract`
 * here instead exhausts the instantiation depth limit.
 */
// TODO: support TypedFetchURL<Schema, T> | TypedFetchRequest<Schema, T>
export type TypedFetchInput<Schema, Method extends AnyHTTPMethod | '' = ''> = TypedFetchPath<Schema, '', NormalizeMethod<Method>>

/** The path a walk arriving at an endpoint has built. A root endpoint is requested as `/`. */
type PathSoFar<Base extends string> = Base extends '' ? '/' : Base

export type TypedFetchPath<Schema, Base extends string = '', Method extends HTTPMethod | '' = ''> = {
  [K in keyof Schema]: K extends typeof Endpoint
    ? '' extends Method
      ? PathSoFar<Base> // return all possible endpoints
      : HasMethod<Schema[K], Method> extends true
        ? PathSoFar<Base> // filter by method passed in
        : never
    : K extends StaticParam
      ? Schema[K] extends Record<string | symbol, unknown>
        ? TypedFetchPath<Schema[K], `${Base}${K}`, Method>
        : never
      : K extends typeof DynamicParam
        ? Schema[K] extends Record<string | symbol, unknown>
          ? TypedFetchPath<Schema[K], `${Base}/${string}${string}`, Method>
          : never
        : K extends typeof WildcardParam
          ? Schema[K] extends Record<string | symbol, unknown>
            // a wildcard matches zero or more segments, so the path without one is offered as well
            ? TypedFetchPath<Schema[K], Base, Method> | TypedFetchPath<Schema[K], `${Base}/${string}${string}`, Method>
            : never
          : never
}[keyof Schema]

/**
 * Whether `Path` resolves to an endpoint, for use in parameter position:
 * `input: T & ValidFetchInput<Schema, T>`. A path that resolves gives `unknown`, leaving the
 * parameter as `T`; one that does not gives a type no string satisfies, whose single key carries the
 * reason. The text of that key is a diagnostic and may change.
 *
 * Intersect it with the whole parameter, never with the path inside it: TypeScript cannot infer
 * through an intersection, so `MaybeRefOrGetter<T & ValidFetchInput<…>>` leaves `T` at its
 * constraint. For the same reason a signature that must accept `` `/users/${id}` `` validates the
 * method instead; see {@link TypedFetchMethods}.
 *
 * An input that is not a path, such as a `Request`, carries nothing to check and is accepted.
 */
export type ValidFetchInput<Schema, Path, Method extends AnyHTTPMethod | '' = ''>
  = [Path] extends [string]
    ? [UnmatchedPath<Schema, Path, Method>] extends [never]
        ? unknown
        // the message is the key, so that TypeScript prints it in place of the parameter type
        : { [K in FetchInputError<UnmatchedPath<Schema, Path, Method>, Method>]: never }
    : unknown

/**
 * The members of `Path` that resolve to no endpoint. Every member must resolve, so a value narrowed
 * to one of several paths cannot pass on the strength of one, and a path known only to be a `string`
 * is rejected.
 */
type UnmatchedPath<Schema, Path, Method extends AnyHTTPMethod | ''>
  = Path extends string
    ? [TypedFetchResolvedMeta<Schema, Path, Method>] extends [never] ? Path : never
    : never

type FetchInputError<Path extends string, Method extends AnyHTTPMethod | ''>
  = '' extends Method
    ? `fetchdts: no route matches '${Path}'`
    : `fetchdts: no ${Uppercase<Method>} route matches '${Path}'`

/**
 * Metadata for the endpoint `Path` resolves to, parameters included, as a router would resolve it.
 * {@link TypedFetchMeta} considers static segments only.
 */
export type TypedFetchResolvedMeta<Schema, Path, Method extends AnyHTTPMethod | '' = ''>
  = TypedFetchMeta<Schema, Path extends string ? Trimmed<Path> : Path, Method, 'dynamic'>

// TODO: optimise me
type RequestInitFor<Meta> = {
  [K in keyof Omit<RequestInit, 'method' | 'body'>]?: K extends keyof Meta
    ? Meta[K]
    : RequestInit[K]
} & (
  'method' extends keyof Meta
    // if GET is a valid method we don't require method to be specified
    ? 'GET' extends Meta['method']
      ? { method?: WritableMethod<Meta['method']> }
      : { method: WritableMethod<Meta['method']> }
    : { method?: RequestInit['method'] }
) & RespectOptionality<Meta, 'body', RequestInit['body']>

/** A method as it may be written at a call site, in either case. */
type WritableMethod<Method> = Method | Lowercase<Method & string>

/**
 * The init for a request to `Path`. Pass `Method` where it is known: a path may reach one endpoint
 * for one method and another for a second, so a method-agnostic init describes only what they share.
 */
export type TypedFetchRequestInit<Schema, T, Method extends AnyHTTPMethod | '' = ''> = RequestInitFor<TypedFetchResolvedMeta<Schema, T, Method>>

/**
 * How a path is matched against a schema.
 *
 * - `exact`: static segments only.
 * - `dynamic`: parameters are considered where no static segment matches.
 * - `ambiguous`: as `dynamic`, but a parameter has consumed a segment known only at runtime, so the
 *   request could also have matched a static sibling. Every sibling the segment could be is
 *   followed, and {@link EndpointMetadata.ambiguousResponse} is preferred where an endpoint declares
 *   one.
 */
export type MatchPattern = 'exact' | 'dynamic' | 'ambiguous'

/**
 * Endpoints reached by matching `Path` against the static keys of `Schema`.
 *
 * The leading segment is looked up as a key, which costs the same whatever the node holds. The scan
 * remains for a key spanning several segments, which a lookup cannot find.
 */
type StaticMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = LookupHead<Schema, HeadKey<Path>, Path, Method, Pattern>

/** The key `Path` begins with: its first segment, or its origin. `never` where it has neither. */
type HeadKey<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? Head extends '' ? never : `/${Head}`
      : Rest extends '' ? never : Path
    : Path extends `${infer Scheme}://${infer Rest}`
      ? Rest extends `${infer Host}/${string}` ? `${Scheme}://${Host}` : Path
      : never

/** The remainder of `Path` after the key {@link HeadKey} consumed. */
type AfterHead<Path extends string>
  = Path extends `/${string}`
    ? AfterSegment<Path>
    : Path extends `${string}://${infer Rest}`
      ? Rest extends `${infer Host}/${string}`
        ? Path extends `${string}://${Host}${infer Tail}` ? Tail : never
        : ''
      : never

type LookupHead<Schema, Head, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = [Head] extends [never]
    ? ScannedStaticMatch<Schema, Path, Method, Pattern>
    : Head extends keyof Schema
      ? OrScanned<MatchPath<Schema[Head], AfterHead<Path>, Method, Pattern>, Schema, Path, Method, Pattern>
      : ScannedStaticMatch<Schema, Path, Method, Pattern>

/**
 * The lookup, or the scan where it found nothing: a node may hold a key spanning several segments
 * beside a key for the first of them.
 */
type OrScanned<Keyed, Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = [Keyed] extends [never]
    ? ScannedStaticMatch<Schema, Path, Method, Pattern>
    : Keyed

/** Endpoints reached by matching `Path` against each static key of `Schema` in turn. */
type ScannedStaticMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern> = {
  [K in keyof Schema]: K extends StaticParam
    ? Path extends `${K}${infer Rest}`
      ? MatchPath<Schema[K], Rest, Method, Pattern>
      : never
    : never
}[keyof Schema]

/**
 * Endpoints reached where the segment being consumed is not fully known, so a key it *could* be is
 * followed as well as one it is: `` `/api/${string}/posts` `` reaches `/api/me/posts`.
 *
 * Only a single-segment key qualifies, since a parameter consumes one segment; a key spanning several
 * is assignable to `` `/${string}` `` and would be reached by a path a router resolves elsewhere.
 */
type PartialStaticMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern> = {
  [K in keyof Schema]: K extends StaticParam
    ? Path extends `${K}${infer Rest}`
      ? MatchPath<Schema[K], Rest, Method, Pattern>
      : SingleSegment<K> extends true
        ? Overlaps<Segment<Path>, K> extends true
          ? MatchPath<Schema[K], AfterSegment<Path>, Method, 'ambiguous'>
          : never
        : never
    : never
}[keyof Schema]

/** Whether a key holds exactly one path segment, which is what a parameter consumes. */
type SingleSegment<Key> = Key extends `/${infer Rest}`
  ? Rest extends `${string}/${string}` ? false : true
  : false

/** Whether two segments have any instantiation in common. */
type Overlaps<Segment, Key> = [Segment] extends [Key] ? true : [Key] extends [Segment] ? true : false

/** Endpoints reached by consuming a segment of `Path` with a dynamic parameter. */
type DynamicMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern> = {
  [K in keyof Schema]: K extends typeof DynamicParam
    ? MatchPath<Schema[K], AfterSegment<Path>, Method, LiteralSegment<Path> extends false ? 'ambiguous' : Pattern>
    : never
}[keyof Schema]

/**
 * Endpoints reached by consuming the remainder of `Path` with a wildcard, which takes zero or more
 * segments: `/files/**` answers `/files` as well as `/files/a/b`. The remainder must begin at a
 * segment boundary, so `/filesystem` does not reach the wildcard under `/files`.
 *
 * A wildcard is terminal, so its endpoints are read directly: walking into it would re-enter this
 * type, which against an unresolved path expands both branches at every level.
 */
type WildcardMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = Path extends '' | `/${string}`
    ? {
        [K in keyof Schema]: K extends typeof WildcardParam
          ? NodeMeta<Schema[K], Method, Pattern>
          : never
      }[keyof Schema]
    : never

/**
 * The static match, or the parameter match where there is none. Where no method was requested, a
 * parameter sibling still answers the methods the static node does not.
 *
 * The static match is passed in rather than computed here, since an unresolved path defers every
 * conditional in the walk and the chain has a limit.
 */
type PreferStatic<Static, Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = [Static] extends [never]
    ? ParamMatch<Schema, Path, Method, Pattern>
    : '' extends Method
      ? Static | ExceptMethods<ParamMatch<Schema, Path, Method, Pattern>, MethodsOf<Static>>
      : Static

/**
 * Endpoints reached by consuming a segment of `Path` with a parameter. A dynamic parameter is more
 * specific than a wildcard, as it is in a router, so the wildcard is consulted only for what the
 * dynamic parameter does not answer.
 */
type ParamMatch<Schema, Path extends string, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = [DynamicMatch<Schema, Path, Method, Pattern>] extends [never]
    ? WildcardMatch<Schema, Path, Method, Pattern>
    : '' extends Method
      // a wildcard sibling still answers the methods the dynamic parameter does not
      ? DynamicMatch<Schema, Path, Method, Pattern> | ExceptMethods<WildcardMatch<Schema, Path, Method, Pattern>, MethodsOf<DynamicMatch<Schema, Path, Method, Pattern>>>
      : DynamicMatch<Schema, Path, Method, Pattern>

type MethodsOf<Meta> = Meta extends { method: infer Method } ? Method : never

type ExceptMethods<Meta, Methods> = Meta extends { method: infer Method }
  ? [Method] extends [Methods] ? never : Meta
  : never

/**
 * Metadata for the endpoints registered directly on a node, narrowed by `Method`
 * when one is provided.
 */
type EndpointMeta<Endpoints, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = '' extends Method
    ? { [M in keyof Endpoints]: { method: M } & Ambiguate<Endpoints[M], Pattern> }[keyof Endpoints] | HeadMeta<Endpoints, Pattern>
    : Method extends keyof Endpoints
      ? Ambiguate<Endpoints[Method], Pattern> & { method: Method }
      : Method extends 'HEAD'
        // `keyof never` carries every key, so an absent `GET` would otherwise ambiguate into a
        // metadata object of index signatures and answer the request
        ? [GetEndpoint<Endpoints>] extends [never]
            ? never
            : Ambiguate<GetEndpoint<Endpoints>, Pattern> & { method: 'HEAD' }
        : never

/** The `GET` endpoint of a node, or `never` where it has none. */
type GetEndpoint<Endpoints> = Endpoints[Extract<'GET', keyof Endpoints>]

/** The implicit `HEAD` endpoint a `GET` route provides, unless the node registers one itself. */
type HeadMeta<Endpoints, Pattern extends MatchPattern>
  = 'HEAD' extends keyof Endpoints
    ? never
    : [GetEndpoint<Endpoints>] extends [never]
        ? never
        : { method: 'HEAD' } & Ambiguate<GetEndpoint<Endpoints>, Pattern>

/**
 * Replaces `response` with `ambiguousResponse` where a parameter consumed a segment known only at
 * runtime and the endpoint declares one. Otherwise the alternatives come from the static siblings the
 * request could also have matched.
 */
type Ambiguate<Metadata, Pattern extends MatchPattern>
  = Pattern extends 'ambiguous'
    ? 'ambiguousResponse' extends keyof Metadata
      ? { [K in Exclude<keyof Metadata, 'ambiguousResponse'>]: K extends 'response' ? Metadata['ambiguousResponse'] : Metadata[K] }
      : Metadata
    : Metadata

/** Whether the segment `Path` is about to consume is a literal rather than `string`-like. */
type LiteralSegment<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? string extends Head ? false : true
      : string extends Rest ? false : true
    : true

/**
 * Whether the segment `Path` is about to consume is known in full. One holding a placeholder
 * anywhere, including behind a literal prefix (`/item-${string}`), may turn out to be a sibling.
 */
type KnownSegment<Path extends string>
  // a mapped type over a template literal key gives a pattern index signature, which an empty object
  // satisfies, where a literal key gives a property that it does not
  = EmptyObject extends Record<Path, 1>
    ? [Segment<Path>] extends [never]
        ? true
        : EmptyObject extends Record<Segment<Path>, 1> ? false : true
    : true

type EmptyObject = Record<never, never>

/** Metadata for the endpoints registered on a node itself. */
type NodeMeta<Schema, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = typeof Endpoint extends keyof Schema
    ? EndpointMeta<Schema[typeof Endpoint], Method, Pattern>
    : never

/** The first non-empty segment of `Path`, including its leading slash. */
type Segment<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? Head extends ''
        ? never
        : `/${Head}`
      : Rest extends ''
        ? never
        : Path
    : never

/** The remainder of `Path` after consuming a single non-empty segment. */
type AfterSegment<Path extends string>
  = Path extends `/${infer Rest}`
    ? Rest extends `${infer Head}/${string}`
      ? Head extends ''
        ? never
        : Path extends `/${Head}${infer Tail}`
          ? Tail
          : never
      : Rest extends ''
        ? never
        : ''
    : never

export type TypedFetchMeta<Schema, Path, Method extends AnyHTTPMethod | '' = '', Pattern extends MatchPattern = 'exact'>
  = MatchPath<Schema, Path, NormalizeMethod<Method>, Pattern>

type MatchPath<Schema, Path, Method extends HTTPMethod | '', Pattern extends MatchPattern>
  = Path extends ''
    ? Pattern extends 'dynamic' | 'ambiguous'
      ? [NodeMeta<Schema, Method, Pattern>] extends [never]
          // the path is exhausted, and a wildcard on this node matches no segments at all
          ? WildcardMatch<Schema, '', Method, Pattern>
          : '' extends Method
            ? NodeMeta<Schema, Method, Pattern> | ExceptMethods<WildcardMatch<Schema, '', Method, Pattern>, MethodsOf<NodeMeta<Schema, Method, Pattern>>>
            : NodeMeta<Schema, Method, Pattern>
      : NodeMeta<Schema, Method, Pattern>
    : Path extends string
      ? Pattern extends 'dynamic' | 'ambiguous'
        ? KnownSegment<Path> extends false
          // the segment is known only at runtime, so every branch it could take is reachable
          ? PartialStaticMatch<Schema, Path, Method, Pattern> | ParamMatch<Schema, Path, Method, Pattern>
          : PreferStatic<StaticMatch<Schema, Path, Method, Pattern>, Schema, Path, Method, Pattern>
        : StaticMatch<Schema, Path, Method, Pattern>
      : never

/**
 * The response body, or `unknown` where the endpoint declares none, so a route registered without a
 * return type stays callable. A path that matches nothing, or an unregistered method, is `never`.
 */
export type TypedFetchResponseBody<Schema, Endpoint, Method extends AnyHTTPMethod = 'GET'>
  // an input that is not a path says nothing about the response, rather than ruling one out
  = [Endpoint] extends [string]
    ? ResolvedResponseBody<Schema, Endpoint, Method>
    : unknown

type ResolvedResponseBody<Schema, Endpoint, Method extends AnyHTTPMethod>
  = 'response' extends keyof TypedFetchResolvedMeta<Schema, Endpoint, Method>
    ? TypedFetchResolvedMeta<Schema, Endpoint, Method>['response']
    : [TypedFetchResolvedMeta<Schema, Endpoint, Method>] extends [never]
        ? never
        : unknown

/**
 * The body a request fails with, where the endpoint declares one. `unknown` where it does not, since
 * declaring nothing says nothing about failure rather than ruling it out.
 */
export type TypedFetchErrorBody<Schema, Endpoint, Method extends AnyHTTPMethod = 'GET'>
  // `keyof never` carries every key, so without this guard the lookup succeeds and gives `never`,
  // which reads as "this endpoint cannot fail"
  = [Endpoint] extends [string]
    ? 'errorResponse' extends keyof TypedFetchResolvedMeta<Schema, Endpoint, Method>
      ? TypedFetchResolvedMeta<Schema, Endpoint, Method>['errorResponse']
      : unknown
    : unknown

/**
 * The shape an endpoint declares for one field of the request, or `Fallback` where it declares none.
 *
 * A whole request init cannot be extended by an interface, since an interface may only extend a type
 * whose members are statically known and a deferred conditional's are not (`TS2312`). An extensible
 * options type writes the keys itself and takes the values from here.
 *
 * Pass `never` as the fallback to tell a declared shape from an absent one, which is what lets a
 * client widen only the declared case: an endpoint declares the headers it requires, not the only
 * ones a request may carry.
 */
export type TypedFetchRequestBody<Schema, Path, Method extends AnyHTTPMethod | '' = '', Fallback = BodyInit | null>
  = DeclaredField<Schema, Path, Method, 'body', Fallback>

export type TypedFetchRequestQuery<Schema, Path, Method extends AnyHTTPMethod | '' = '', Fallback = Record<string, unknown>>
  = DeclaredField<Schema, Path, Method, 'query', Fallback>

export type TypedFetchRequestHeaders<Schema, Path, Method extends AnyHTTPMethod | '' = '', Fallback = HeadersInit>
  = DeclaredField<Schema, Path, Method, 'headers', Fallback>

type DeclaredField<Schema, Path, Method extends AnyHTTPMethod | '', Field extends string, Fallback>
  // a path that resolves to nothing declares nothing, so it falls back: `keyof never` carries every
  // key, so the lookup would otherwise succeed and give an option no value satisfies
  = [TypedFetchResolvedMeta<Schema, Path, Method>] extends [never]
    ? Fallback
    : Field extends keyof TypedFetchResolvedMeta<Schema, Path, Method>
      ? TypedFetchResolvedMeta<Schema, Path, Method>[Field]
      : Fallback

/**
 * Whether the endpoint requires `Field`, for a consumer deciding which members of its own options
 * type to make required. A field declared optional, or not declared, is not required.
 */
export type TypedFetchRequires<Schema, Path, Method extends AnyHTTPMethod | '', Field extends 'body' | 'query' | 'headers'>
  // a path that resolves to nothing requires nothing; without this every field reports as required,
  // since `keyof never` carries every key
  = [TypedFetchResolvedMeta<Schema, Path, Method>] extends [never]
    ? false
    : Field extends keyof TypedFetchResolvedMeta<Schema, Path, Method>
      ? [TypedFetchResolvedMeta<Schema, Path, Method>[Field]] extends [NonNullable<TypedFetchResolvedMeta<Schema, Path, Method>[Field]>]
          ? true
          : false
      : false

/**
 * The methods a path answers, or every method where it resolves to nothing.
 *
 * A path union carries no method, so a signature constrained by one accepts a path the schema knows
 * for a method it does not. Constrain the method with this rather than intersecting a validator onto
 * the path, which stops a template literal argument from inferring as one:
 * `init?: { method?: M & TypedFetchMethods<Schema, T> }`.
 */
export type TypedFetchMethods<Schema, Path>
  // `never extends { method: infer Method }` holds and infers nothing, so the fallback needs its own
  // branch or an unresolved path answers `unknown`
  = [TypedFetchResolvedMeta<Schema, Path, ''>] extends [never]
    ? AnyHTTPMethod
    : TypedFetchResolvedMeta<Schema, Path, ''> extends { method: infer Method }
      ? Method
      : AnyHTTPMethod

export type TypedFetchResponseHeaders<Schema, Endpoint, Method extends AnyHTTPMethod = 'GET'>
  = 'responseHeaders' extends keyof TypedFetchResolvedMeta<Schema, Endpoint, Method>
    ? TypedFetchResolvedMeta<Schema, Endpoint, Method>['responseHeaders']
    : never

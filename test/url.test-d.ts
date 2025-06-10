import type { TypedURLSearchParams } from '../src/http/url'
import { describe, expectTypeOf, it } from 'vitest'

describe('TypedURLSearchParams', () => {
  interface TestQueryMap {
    page: '1' | '2'
    limit: string
    search: string
  }

  it('should preserve URLSearchParams interface properties', () => {
    type TestParams = TypedURLSearchParams<{ test: string }>

    // Should have all URLSearchParams properties including size
    expectTypeOf<TestParams>().toHaveProperty('size')
    expectTypeOf<TestParams['size']>().toEqualTypeOf<Readonly<number>>()

    // Should have the typed method overrides
    expectTypeOf<TestParams>().toHaveProperty('append')
    expectTypeOf<TestParams>().toHaveProperty('delete')
    expectTypeOf<TestParams>().toHaveProperty('get')
    expectTypeOf<TestParams>().toHaveProperty('getAll')
    expectTypeOf<TestParams>().toHaveProperty('has')
    expectTypeOf<TestParams>().toHaveProperty('set')
    expectTypeOf<TestParams>().toHaveProperty('sort')
    expectTypeOf<TestParams>().toHaveProperty('toString')
    expectTypeOf<TestParams>().toHaveProperty('forEach')

    // Should have all other URLSearchParams properties/methods
    expectTypeOf<keyof TestParams>().toEqualTypeOf<keyof URLSearchParams>()
  })

  it('should type append method correctly', () => {
    type AppendMethod = TypedURLSearchParams<TestQueryMap>['append']

    expectTypeOf<AppendMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<AppendMethod>().parameter(1).toEqualTypeOf<string>()
    expectTypeOf<AppendMethod>().returns.toEqualTypeOf<void>()
  })

  it('should type delete method correctly', () => {
    type DeleteMethod = TypedURLSearchParams<TestQueryMap>['delete']

    expectTypeOf<DeleteMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<DeleteMethod>().parameter(1).toEqualTypeOf<string | undefined>()
    expectTypeOf<DeleteMethod>().returns.toEqualTypeOf<void>()
  })

  it('should type get method correctly', () => {
    type GetMethod = TypedURLSearchParams<TestQueryMap>['get']

    expectTypeOf<GetMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<GetMethod>().returns.toEqualTypeOf<string | null>()
  })

  it('should type getAll method correctly', () => {
    type GetAllMethod = TypedURLSearchParams<TestQueryMap>['getAll']

    expectTypeOf<GetAllMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<GetAllMethod>().returns.toEqualTypeOf<Array<string>>()
  })

  it('should type has method correctly', () => {
    type HasMethod = TypedURLSearchParams<TestQueryMap>['has']

    expectTypeOf<HasMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<HasMethod>().parameter(1).toEqualTypeOf<string | undefined>()
    expectTypeOf<HasMethod>().returns.toEqualTypeOf<boolean>()
  })

  it('should type set method correctly', () => {
    type SetMethod = TypedURLSearchParams<TestQueryMap>['set']

    expectTypeOf<SetMethod>().parameter(0).toEqualTypeOf<keyof TestQueryMap | (string & {})>()
    expectTypeOf<SetMethod>().parameter(1).toEqualTypeOf<string>()
    expectTypeOf<SetMethod>().returns.toEqualTypeOf<void>()
  })

  it('should type utility methods correctly', () => {
    type SortMethod = TypedURLSearchParams<TestQueryMap>['sort']
    type ToStringMethod = TypedURLSearchParams<TestQueryMap>['toString']
    type ForEachMethod = TypedURLSearchParams<TestQueryMap>['forEach']

    expectTypeOf<SortMethod>().returns.toEqualTypeOf<void>()
    expectTypeOf<ToStringMethod>().returns.toEqualTypeOf<string>()
    expectTypeOf<ForEachMethod>().parameter(0).toEqualTypeOf<(value: string | string & {}, key: keyof TestQueryMap | string & {}, parent: URLSearchParams) => void>()
    expectTypeOf<ForEachMethod>().parameter(1).toEqualTypeOf<any>()
    expectTypeOf<ForEachMethod>().returns.toEqualTypeOf<void>()
  })

  it('should work with default generic type', () => {
    type DefaultParams = TypedURLSearchParams

    expectTypeOf<DefaultParams['get']>().parameter(0).toEqualTypeOf<string | (string & {})>()
    expectTypeOf<DefaultParams['get']>().returns.toEqualTypeOf<string | null>()
  })

  it('should work with unknown query map', () => {
    type UnknownParams = TypedURLSearchParams<unknown>

    expectTypeOf<UnknownParams['get']>().parameter(0).toEqualTypeOf<string & {}>()
    expectTypeOf<UnknownParams['get']>().returns.toEqualTypeOf<string | null>()
  })

  it('should work with partial record', () => {
    type PartialParams = TypedURLSearchParams<Partial<Record<string, string>>>

    expectTypeOf<PartialParams['get']>().parameter(0).toEqualTypeOf<string | (string & {})>()
    expectTypeOf<PartialParams['get']>().returns.toEqualTypeOf<string | null>()
  })

  it('should handle typed query map with specific values', () => {
    interface TypedQueryMap {
      status: 'active' | 'inactive'
      sort: 'asc' | 'desc'
      category: string
    }

    type TypedParams = TypedURLSearchParams<TypedQueryMap>

    // get method should return conditional types based on the key
    expectTypeOf<TypedParams['get']>().parameter(0).toEqualTypeOf<keyof TypedQueryMap | (string & {})>()
    expectTypeOf<TypedParams['get']>().returns.toEqualTypeOf<'active' | 'inactive' | 'asc' | 'desc' | string | null>()

    // append/set should accept conditional types based on the key
    expectTypeOf<TypedParams['append']>().parameter(1).toEqualTypeOf<'active' | 'inactive' | 'asc' | 'desc' | string>()
    expectTypeOf<TypedParams['set']>().parameter(1).toEqualTypeOf<'active' | 'inactive' | 'asc' | 'desc' | string>()
  })

  it('should preserve URLSearchParams interface methods', () => {
    type TestParams = TypedURLSearchParams<{ test: string }>

    // Should have all URLSearchParams properties
    expectTypeOf<TestParams>().toHaveProperty('size')
    expectTypeOf<TestParams>().toHaveProperty('append')
    expectTypeOf<TestParams>().toHaveProperty('delete')
    expectTypeOf<TestParams>().toHaveProperty('get')
    expectTypeOf<TestParams>().toHaveProperty('getAll')
    expectTypeOf<TestParams>().toHaveProperty('has')
    expectTypeOf<TestParams>().toHaveProperty('set')
    expectTypeOf<TestParams>().toHaveProperty('sort')
    expectTypeOf<TestParams>().toHaveProperty('toString')
    expectTypeOf<TestParams>().toHaveProperty('forEach')
  })

  it('should handle string & {} pattern for extensibility', () => {
    interface QueryMap {
      known: string
    }

    type TestParams = TypedURLSearchParams<QueryMap>

    // Should accept both known keys and arbitrary strings
    const params = {} as TestParams

    expectTypeOf(params.get).toBeCallableWith('known')
    expectTypeOf(params.get).toBeCallableWith('unknown-param')
    expectTypeOf(params.append).toBeCallableWith('known', 'value')
    expectTypeOf(params.append).toBeCallableWith('unknown-param', 'value')
  })

  it('should handle forEach callback typing', () => {
    interface QueryMap {
      test: string
      another: string
    }

    type TestParams = TypedURLSearchParams<QueryMap>
    const params = {} as TestParams

    params.forEach((value, key, parent) => {
      expectTypeOf(value).toEqualTypeOf<string>()
      expectTypeOf(key).toEqualTypeOf<(string & {}) | keyof QueryMap>()
      expectTypeOf(parent).toEqualTypeOf<URLSearchParams>()
    })
  })

  it('should constrain query map to string values', () => {
    interface InvalidQueryMap {
      id: number // This should still work but be treated as unknown
      name: string
    }

    type InvalidParams = TypedURLSearchParams<InvalidQueryMap>

    // The interface should still be usable even with non-string types
    expectTypeOf<InvalidParams['get']>().parameter(0).toEqualTypeOf<keyof InvalidQueryMap | (string & {})>()
  })

  it('should handle string literal types for specific keys', () => {
    type TestParams = TypedURLSearchParams<TestQueryMap>
    const params = {} as TestParams

    // When using the specific 'page' key, should return the literal types
    expectTypeOf(params.get('page')).toEqualTypeOf<'1' | '2' | null>()
    expectTypeOf(params.getAll('page')).toEqualTypeOf<Array<'1' | '2'>>()

    // When setting page, should only accept the literal values or string
    expectTypeOf(params.append).toBeCallableWith('page', '1')
    expectTypeOf(params.append).toBeCallableWith('page', '2')
    expectTypeOf(params.set).toBeCallableWith('page', '1')
    expectTypeOf(params.set).toBeCallableWith('page', '2')

    // When using other keys with string type, should work with any string
    expectTypeOf(params.get('limit')).toEqualTypeOf<string | null>()
    expectTypeOf(params.get('search')).toEqualTypeOf<string | null>()

    // When using unknown keys, should fallback to string
    expectTypeOf(params.get('unknown')).toEqualTypeOf<string | null>()
  })
})

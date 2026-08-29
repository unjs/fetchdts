import type { Route } from '../../src/serialize'
import { DynamicParam, WildcardParam } from '../../src/tree'

export const routes: Route[] = [
  {
    segments: ['/api', '/health'],
    metadata: {
      GET: { responseType: '{ status: \'ok\' }' },
    },
  },
  {
    segments: ['/api', '/users'],
    metadata: {
      GET: { responseType: '{ id: number }[]' },
      POST: { bodyType: '{ name: string }', responseType: '{ id: number }' },
    },
  },
  {
    segments: ['/api', '/users', DynamicParam],
    metadata: {
      GET: { responseType: '{ id: number, name: string }' },
    },
  },
  {
    // the plain object form, as it arrives from a tool that cannot pass symbols
    segments: [{ type: 'static', value: 'api' }, { type: 'static', value: 'users' }, { type: 'dynamic' }, { type: 'static', value: 'posts' }],
    metadata: {
      GET: { responseType: '{ title: string }[]' },
    },
  },
  {
    segments: ['/api', '/comments', '/latest'],
    metadata: {
      GET: { responseType: '{ latest: true }' },
    },
  },
  {
    // a request built from a runtime value could match `/latest`, so the caller precomputes the union
    segments: ['/api', '/comments', DynamicParam],
    metadata: {
      GET: {
        responseType: '{ body: string }',
        ambiguousResponseType: '{ body: string } | { latest: true }',
      },
    },
  },
  {
    // a handler registered for every method, as a route with no method is in nitro
    segments: ['/api', '/ping'],
    metadata: {
      ALL: { responseType: '\'pong\'' },
    },
  },
  {
    segments: ['/api', '/search'],
    metadata: {
      ALL: { responseType: '{ results: string[] }' },
      POST: { bodyType: '{ query: string }', responseType: '{ results: string[], total: number }' },
    },
  },
  {
    segments: ['/api', '/files', WildcardParam],
    metadata: {
      GET: { responseType: 'Blob' },
    },
  },
]

import type { RouteTree } from './tree'
import type * as Symbols from './tree'

import { DynamicParam, Endpoint, WildcardParam } from './tree'

export { DynamicParam, Endpoint, WildcardParam } from './tree'

interface RenderedFetchSchema {
  imports: string
  declaration: string
}

interface GenerateFetchSchemaOptions<S> {
  name: string
  schema: S
}

export function serializeFetchSchema<S extends RouteTree>(options: GenerateFetchSchemaOptions<S>): RenderedFetchSchema {
  const usedTypes = new Set<keyof typeof Symbols>()

  const contents = _serialize(options.schema, usedTypes)

  return {
    imports: `import type { ${[...usedTypes].join(', ')} } from 'fetchdts'`,
    declaration: `
export interface ${options.name} {
${contents}
}`,
  }
}

function _serialize(schema: RouteTree, usedTypes: Set<keyof typeof Symbols>, indent = 2) {
  let code = ''
  for (const key in schema) {
    if (typeof key === 'string') {
      const lines = [
        `${JSON.stringify(key)}: {`,
        _serialize(schema[key], usedTypes, indent + 2),
        '}',
        '',
      ]
      code += lines.map(line => ' '.repeat(indent) + line).join('\n')
    }
  }
  return code
}

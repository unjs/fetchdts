import { readdir, rm } from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: 'node16',
  hooks: {
    'rollup:done': async function () {
      // default to .js and .d.ts extensions
      for (const file of await readdir('dist')) {
        if (file.endsWith('.d.cts')) {
          await rm(`dist/${file}`)
        }
      }
    },
  },
})

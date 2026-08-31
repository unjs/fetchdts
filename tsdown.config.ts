import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/compiler.ts'],
  dts: { oxc: true },
  exports: { devExports: true },
})

import { build } from 'tsup'
import fs from 'node:fs'

console.log('Building standalone ESM bundle for PyPI...')
await build({
  entry: ['src/cli.tsx'],
  format: 'esm',
  target: 'node18',
  platform: 'node',
  clean: false,
  outDir: 'pypi/src/open_nami',
  banner: {
    js: `#!/usr/bin/env node
import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`,
  },
  config: false,
  noExternal: [/^(?!react-devtools-core).*$/],
  external: ['react-devtools-core'],
  esbuildOptions(options) {
    options.platform = 'node'
    options.external = ['react-devtools-core']
  },
})

fs.copyFileSync('README.md', 'pypi/README.md')
fs.copyFileSync('LICENSE', 'pypi/LICENSE')
console.log('Standalone bundle built and README/LICENSE synced successfully!')

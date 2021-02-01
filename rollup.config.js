import path from 'path'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const createBabelConfig = require('./babel.config')

const { root } = path.parse(process.cwd())
const external = (id) => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.js', '.ts', '.tsx']
const getBabelOptions = (targets) => ({
  ...createBabelConfig({ env: (env) => env === 'build' }, targets),
  extensions,
})

function createDeclarationConfig(input, output) {
  return {
    input,
    output: {
      dir: output,
    },
    external,
    plugins: [typescript({ declaration: true, outDir: output })],
  }
}

function createESMConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'esm' },
    external,
    plugins: [
      resolve({ extensions }),
      typescript(),
      babel(getBabelOptions({ node: 8 })),
      sizeSnapshot(),
    ],
  }
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'cjs', exports: 'named' },
    external,
    plugins: [
      resolve({ extensions }),
      typescript(),
      babel(getBabelOptions({ ie: 11 })),
      sizeSnapshot(),
    ],
  }
}

export default (args) =>
  args['config-cjs']
    ? [
        createDeclarationConfig('src/index.ts', 'dist'),
        createCommonJSConfig('src/index.ts', 'dist/index.js'),
        createCommonJSConfig('src/utils.ts', 'dist/utils.js'),
        createCommonJSConfig('src/devtools.ts', 'dist/devtools.js'),
        createCommonJSConfig('src/immer.ts', 'dist/immer.js'),
        createCommonJSConfig('src/optics.ts', 'dist/optics.js'),
        createCommonJSConfig('src/query.ts', 'dist/query.js'),
      ]
    : [
        createDeclarationConfig('src/index.ts', 'dist/modules'),
        createESMConfig('src/index.ts', 'dist/modules/index.mjs'),
        createESMConfig('src/utils.ts', 'dist/modules/utils.mjs'),
        createESMConfig('src/devtools.ts', 'dist/modules/devtools.mjs'),
        createESMConfig('src/immer.ts', 'dist/modules/immer.mjs'),
        createESMConfig('src/optics.ts', 'dist/modules/optics.mjs'),
        createESMConfig('src/query.ts', 'dist/modules/query.mjs'),
      ]

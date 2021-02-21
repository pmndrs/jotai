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
        createCommonJSConfig('src/xstate.ts', 'dist/xstate.js'),
      ]
    : [
        createESMConfig('src/index.ts', 'dist/index.module.js'),
        createESMConfig('src/utils.ts', 'dist/utils.module.js'),
        createESMConfig('src/devtools.ts', 'dist/devtools.module.js'),
        createESMConfig('src/immer.ts', 'dist/immer.module.js'),
        createESMConfig('src/optics.ts', 'dist/optics.module.js'),
        createESMConfig('src/query.ts', 'dist/query.module.js'),
        createESMConfig('src/xstate.ts', 'dist/xstate.module.js'),
      ]

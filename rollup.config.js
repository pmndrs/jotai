import path from 'path'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'
import typescript from 'rollup-plugin-typescript2'

const createBabelConfig = require('./babel.config')

const { root } = path.parse(process.cwd())
const external = (id) => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.js', '.ts', '.tsx']
const getBabelOptions = (targets) => ({
  ...createBabelConfig({ env: (env) => env === 'build' }, targets),
  extensions,
})

function createESMConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'esm' },
    external,
    plugins: [
      typescript(),
      babel(getBabelOptions({ node: 8 })),
      sizeSnapshot(),
      resolve({ extensions }),
    ],
  }
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'cjs', exports: 'named' },
    external,
    plugins: [
      typescript(),
      babel(getBabelOptions({ ie: 11 })),
      sizeSnapshot(),
      resolve({ extensions }),
    ],
  }
}

function createIIFEConfig(input, output, globalName) {
  return {
    input,
    output: {
      file: output,
      format: 'iife',
      exports: 'named',
      name: globalName,
      globals: {
        react: 'React',
      },
    },
    external,
    plugins: [
      typescript(),
      babel(getBabelOptions({ ie: 11 })),
      sizeSnapshot(),
      resolve({ extensions }),
    ],
  }
}

export default [
  createESMConfig('src/index.ts', 'dist/index.js'),
  createCommonJSConfig('src/index.ts', 'dist/index.cjs.js'),
  createIIFEConfig('src/index.ts', 'dist/index.iife.js', 'jotai'),
  createESMConfig('src/utils.ts', 'dist/utils.js'),
  createCommonJSConfig('src/utils.ts', 'dist/utils.cjs.js'),
  createESMConfig('src/immer.ts', 'dist/immer.js'),
  createCommonJSConfig('src/immer.ts', 'dist/immer.cjs.js'),
]

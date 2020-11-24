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
        createCommonJSConfig('src/index.ts', 'dist/index.cjs.js'),
        createCommonJSConfig('src/utils.ts', 'dist/utils.cjs.js'),
        createCommonJSConfig('src/devtools.ts', 'dist/devtools.cjs.js'),
        createCommonJSConfig('src/immer.ts', 'dist/immer.cjs.js'),
        createCommonJSConfig('src/optics.ts', 'dist/optics.cjs.js'),
      ]
    : [
        createDeclarationConfig('src/index.ts', 'dist'),
        createESMConfig('src/index.ts', 'dist/index.js'),
        createIIFEConfig('src/index.ts', 'dist/index.iife.js', 'jotai'),
        createESMConfig('src/utils.ts', 'dist/utils.js'),
        createESMConfig('src/devtools.ts', 'dist/devtools.js'),
        createESMConfig('src/immer.ts', 'dist/immer.js'),
        createESMConfig('src/optics.ts', 'dist/optics.js'),
      ]

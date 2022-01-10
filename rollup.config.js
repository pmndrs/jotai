import path from 'path'
import babelPlugin from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import esbuild from 'rollup-plugin-esbuild'
const createBabelConfig = require('./babel.config')

const extensions = ['.js', '.ts', '.tsx']
const { root } = path.parse(process.cwd())

function external(id) {
  return !id.startsWith('.') && !id.startsWith(root)
}

function getBabelOptions(targets) {
  return {
    ...createBabelConfig({ env: (env) => env === 'build' }, targets),
    extensions,
    comments: false,
    babelHelpers: 'bundled',
  }
}

function getEsbuild(target) {
  return esbuild({
    minify: false,
    target,
    platform: 'neutral',
    tsconfig: path.resolve('./tsconfig.json'),
  })
}

function createDeclarationConfig(input, output) {
  return {
    input,
    output: {
      dir: output,
    },
    external,
    plugins: [
      typescript({
        declaration: true,
        emitDeclarationOnly: true,
        outDir: output,
      }),
    ],
  }
}

function createESMConfig(input, output) {
  return {
    input,
    output: [
      { file: `${output}.js`, format: 'esm' },
      { file: `${output}.mjs`, format: 'esm' },
    ],
    external,
    plugins: [resolve({ extensions }), getEsbuild('node12')],
  }
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: 'cjs', exports: 'named' },
    external,
    plugins: [
      resolve({ extensions }),
      babelPlugin(getBabelOptions({ ie: 11 })),
    ],
  }
}

function createUMDConfig(input, output) {
  return {
    input,
    output: {
      file: output,
      format: 'umd',
      exports: 'named',
      name: 'jotai',
    },
    external,
    plugins: [
      resolve({ extensions }),
      babelPlugin(getBabelOptions({ ie: 11 })),
    ],
  }
}

function createSystemConfig(input, output) {
  return {
    input,
    output: {
      file: output,
      format: 'system',
      exports: 'named',
    },
    external,
    plugins: [resolve({ extensions }), getEsbuild('node12')],
  }
}

export default function (args) {
  let c = Object.keys(args).find((key) => key.startsWith('config-'))
  if (c) {
    c = c.slice('config-'.length).replace(/_/g, '/')
    return [
      createCommonJSConfig(`src/${c}.ts`, `dist/${c}.js`),
      createESMConfig(`src/${c}.ts`, `dist/esm/${c}`),
      createUMDConfig(`src/${c}.ts`, `dist/umd/${c}.js`),
      createSystemConfig(`src/${c}.ts`, `dist/system/${c}.js`),
    ]
  }
  return [
    createDeclarationConfig('src/index.ts', 'dist'),
    createCommonJSConfig('src/index.ts', 'dist/index.js'),
    createESMConfig('src/index.ts', 'dist/esm/index'),
    createUMDConfig('src/index.ts', 'dist/umd/index.js'),
    createSystemConfig('src/index.ts', 'dist/system/index.js'),
  ]
}

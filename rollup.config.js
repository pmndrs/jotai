const path = require('path')
const alias = require('@rollup/plugin-alias')
const babelPlugin = require('@rollup/plugin-babel')
const resolve = require('@rollup/plugin-node-resolve')
const replace = require('@rollup/plugin-replace')
const terser = require('@rollup/plugin-terser')
const typescript = require('@rollup/plugin-typescript')
const banner2 = require('rollup-plugin-banner2')
const { default: esbuild } = require('rollup-plugin-esbuild')
const createBabelConfig = require('./babel.config.js')

const extensions = ['.js', '.ts', '.tsx']
const { root } = path.parse(process.cwd())
const entries = [
  { find: /.*\/vanilla\/utils\.ts$/, replacement: 'jotai/vanilla/utils' },
  { find: /.*\/react\/utils\.ts$/, replacement: 'jotai/react/utils' },
  { find: /.*\/vanilla\.ts$/, replacement: 'jotai/vanilla' },
  { find: /.*\/react\.ts$/, replacement: 'jotai/react' },
]

function external(id) {
  return !id.startsWith('.') && !id.startsWith(root)
}

const cscComment = `'use client';\n`

function getBabelOptions(targets) {
  return {
    ...createBabelConfig({ env: (env) => env === 'build' }, targets),
    extensions,
    comments: false,
    babelHelpers: 'bundled',
  }
}

function getEsbuild(env = 'development') {
  return esbuild({
    minify: env === 'production',
    target: 'es2018',
    supported: { 'import-meta': true },
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

function createESMConfig(input, output, clientOnly) {
  return {
    input,
    output: { file: output, format: 'esm' },
    external,
    plugins: [
      alias({ entries: entries.filter((e) => !e.find.test(input)) }),
      resolve({ extensions }),
      replace({
        ...(output.endsWith('.js')
          ? {
              'import.meta.env?.MODE': 'process.env.NODE_ENV',
            }
          : {
              'import.meta.env?.MODE':
                '(import.meta.env ? import.meta.env.MODE : undefined)',
            }),
        'import.meta.env?.USE_STORE2': 'false',
        delimiters: ['\\b', '\\b(?!(\\.|/))'],
        preventAssignment: true,
      }),
      getEsbuild(),
      banner2(() => clientOnly && cscComment),
    ],
  }
}

function createCommonJSConfig(input, output, clientOnly) {
  return {
    input,
    output: { file: `${output}.js`, format: 'cjs' },
    external,
    plugins: [
      alias({ entries: entries.filter((e) => !e.find.test(input)) }),
      resolve({ extensions }),
      replace({
        'import.meta.env?.MODE': 'process.env.NODE_ENV',
        'import.meta.env?.USE_STORE2': 'false',
        delimiters: ['\\b', '\\b(?!(\\.|/))'],
        preventAssignment: true,
      }),
      babelPlugin(getBabelOptions({ ie: 11 })),
      banner2(() => clientOnly && cscComment),
    ],
  }
}

function createUMDConfig(input, output, env, clientOnly) {
  let name = 'jotai'
  const fileName = output.slice('dist/umd/'.length)
  const capitalize = (s) => s.slice(0, 1).toUpperCase() + s.slice(1)
  if (fileName !== 'index') {
    name += fileName.replace(/(\w+)\W*/g, (_, p) => capitalize(p))
  }
  return {
    input,
    output: {
      file: `${output}.${env}.js`,
      format: 'umd',
      name,
      globals: {
        react: 'React',
        'jotai/vanilla': 'jotaiVanilla',
        'jotai/utils': 'jotaiUtils',
        'jotai/react': 'jotaiReact',
        'jotai/vanilla/utils': 'jotaiVanillaUtils',
        'jotai/react/utils': 'jotaiReactUtils',
      },
    },
    external,
    plugins: [
      alias({ entries: entries.filter((e) => !e.find.test(input)) }),
      resolve({ extensions }),
      replace({
        'import.meta.env?.MODE': JSON.stringify(env),
        delimiters: ['\\b', '\\b(?!(\\.|/))'],
        preventAssignment: true,
      }),
      babelPlugin(getBabelOptions({ ie: 11 })),
      banner2(() => clientOnly && cscComment),
      ...(env === 'production' ? [terser()] : []),
    ],
  }
}

function createSystemConfig(input, output, env, clientOnly) {
  return {
    input,
    output: {
      file: `${output}.${env}.js`,
      format: 'system',
    },
    external,
    plugins: [
      alias({ entries: entries.filter((e) => !e.find.test(input)) }),
      resolve({ extensions }),
      replace({
        'import.meta.env?.MODE': JSON.stringify(env),
        delimiters: ['\\b', '\\b(?!(\\.|/))'],
        preventAssignment: true,
      }),
      getEsbuild(env),
      banner2(() => clientOnly && cscComment),
    ],
  }
}

module.exports = function (args) {
  let c = Object.keys(args).find((key) => key.startsWith('config-'))
  const clientOnly = Object.keys(args).some((key) => key === 'client-only')
  if (c) {
    c = c.slice('config-'.length).replace(/_/g, '/')
  } else {
    c = 'index'
  }
  return [
    ...(c === 'index' ? [createDeclarationConfig(`src/${c}.ts`, 'dist')] : []),
    createCommonJSConfig(`src/${c}.ts`, `dist/${c}`, clientOnly),
    createESMConfig(`src/${c}.ts`, `dist/esm/${c}.mjs`, clientOnly),
    createUMDConfig(`src/${c}.ts`, `dist/umd/${c}`, 'development', clientOnly),
    createUMDConfig(`src/${c}.ts`, `dist/umd/${c}`, 'production', clientOnly),
    createSystemConfig(
      `src/${c}.ts`,
      `dist/system/${c}`,
      'development',
      clientOnly,
    ),
    createSystemConfig(
      `src/${c}.ts`,
      `dist/system/${c}`,
      'production',
      clientOnly,
    ),
  ]
}

module.exports.entries = entries

/*global process*/
import path from 'path'
import alias from '@rollup/plugin-alias'
import babelPlugin from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import banner2 from 'rollup-plugin-banner2'
import esbuild from 'rollup-plugin-esbuild'
import createBabelConfig from './babel.config.js'

const extensions = ['.js', '.ts', '.tsx']
const { root } = path.parse(process.cwd())
export const entries = [
  {
    find: /.*\/vanilla\/internals\.ts$/,
    replacement: 'jotai/vanilla/internals',
  },
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
      alias({ entries: entries.filter((entry) => !entry.find.test(input)) }),
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
      alias({ entries: entries.filter((entry) => !entry.find.test(input)) }),
      resolve({ extensions }),
      replace({
        'import.meta.env?.MODE': 'process.env.NODE_ENV',
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
  const capitalize = (str) => str.slice(0, 1).toUpperCase() + str.slice(1)
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
      alias({ entries: entries.filter((entry) => !entry.find.test(input)) }),
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
      alias({ entries: entries.filter((entry) => !entry.find.test(input)) }),
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

export default function (args) {
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

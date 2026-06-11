/*global process*/
import path from 'path'
import alias from '@rollup/plugin-alias'
import babelPlugin from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import typescript from '@rollup/plugin-typescript'
import banner2 from 'rollup-plugin-banner2'
import esbuild from 'rollup-plugin-esbuild'
import createBabelConfig from './babel.config.mjs'

const extensions = ['.js', '.ts', '.tsx']
const { root } = path.parse(process.cwd())
export const entries = [
  { find: /.*\/vanilla\/utils\.ts$/, replacement: 'jotai/vanilla/utils' },
  { find: /.*\/internals\.ts$/, replacement: 'jotai/vanilla/internals' },
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
        'import.meta.env?.MODE':
          '(import.meta.env ? import.meta.env.MODE : undefined)',
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
    output: { file: `${output}.cjs`, format: 'cjs' },
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
    createESMConfig(`src/${c}.ts`, `dist/esm/${c}.js`, clientOnly),
  ]
}

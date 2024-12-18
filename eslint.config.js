const eslint = require('@eslint/js')
const vitest = require('@vitest/eslint-plugin')
const importPlugin = require('eslint-plugin-import')
const jestDom = require('eslint-plugin-jest-dom')
const prettierRecommended = require(
  require.resolve('eslint-plugin-prettier/recommended'),
)
const react = require('eslint-plugin-react')
const reactCompiler = require('eslint-plugin-react-compiler')
const reactHooks = require('eslint-plugin-react-hooks')
const testingLibrary = require('eslint-plugin-testing-library')
const globals = require('globals')
const tseslint = require('typescript-eslint')

module.exports = tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  react.configs.flat['jsx-runtime'],
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals['shared-node-browser'],
        ...globals.node,
        ...globals.es2015,
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-compiler': reactCompiler,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      'import/parsers': {
        '@typescript-eslint/parser': ['.js', '.jsx', '.ts', '.tsx'],
      },
      'import/resolver': {
        alias: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          map: [
            ['^jotai$', './src/index.ts'],
            ['jotai', './src'],
          ],
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-compiler/react-compiler': 'warn',
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      curly: ['warn', 'multi-line', 'consistent'],
      'no-console': 'off',
      'import/extensions': ['error', 'always'],
      'import/no-unresolved': ['error', { commonjs: true, amd: true }],
      'import/export': 'error',
      'import/no-duplicates': ['error'],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'import/namespace': 'off',
      'import/named': 'off',
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
          ],
          'newlines-between': 'never',
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    ...jestDom.configs['flat/recommended'],
    ...vitest.configs.recommended,
    rules: {
      'import/extensions': ['error', 'never'],
      'vitest/expect-expect': 'off',
      'vitest/consistent-test-it': [
        'error',
        { fn: 'it', withinDescribe: 'it' },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettierRecommended,
)

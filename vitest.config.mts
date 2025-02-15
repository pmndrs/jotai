import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
// eslint-disable-next-line import/extensions
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^jotai$/, replacement: resolve('./src/index.ts') },
      { find: /^jotai(.*)$/, replacement: resolve('./src/$1.ts') },
    ],
  },
  plugins: [
    react({
      babel: {
        plugins: existsSync('./dist/babel/plugin-debug-label.js')
          ? [
              // FIXME Can we read from ./src instead of ./dist?
              './dist/babel/plugin-debug-label.js',
            ]
          : [],
      },
    }),
  ],
  test: {
    name: 'jotai',
    // Keeping globals to true triggers React Testing Library's auto cleanup
    // https://vitest.dev/guide/migration.html
    globals: true,
    environment: 'jsdom',
    dir: 'tests',
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage/',
      provider: 'v8',
      include: ['src/**'],
    },
    onConsoleLog(log) {
      if (log.includes('DOMException')) return false
    },
  },
})

import { resolve } from 'path'
// eslint-disable-next-line import/extensions
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^jotai$/, replacement: resolve('./src/index.ts') },
      { find: /^jotai(.*)$/, replacement: resolve('./src/$1.ts') },
    ],
  },
  test: {
    name: 'jotai',
    // Keeping globals to true triggers React Testing Library's auto cleanup
    // https://vitest.dev/guide/migration.html
    globals: true,
    environment: 'jsdom',
    dir: 'tests',
    reporters: 'basic',
    coverage: {
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage/',
      include: ['src/**'],
    },
    onConsoleLog(log) {
      if (log.includes('DOMException')) return false
    },
  },
})

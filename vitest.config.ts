import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^jotai$/, replacement: './src/index.ts' },
      { find: /^jotai(.*)$/, replacement: './src/$1.ts' },
    ],
  },
  test: {
    name: 'jotai',
    // Keeping globals on let's React Testing Library
    globals: true,
    environment: 'jsdom',
    dir: 'tests',
    reporters: 'basic',
    coverage: {
      reporter: ['text', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage/',
    },
  },
})

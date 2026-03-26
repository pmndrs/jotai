#!/usr/bin/env npx tsx

/// <reference types="node" />

/**
 * Run all benchmark suites sequentially.
 * Usage: npx tsx benchmarks/run-all.ts
 *
 * Each benchmark file saves its own JSON and chart.html via benny.
 */

import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const benchFiles = readdirSync(__dirname)
  .filter((f) => f.endsWith('.ts') && f !== 'run-all.ts')
  .sort()

console.log(`\n${'='.repeat(60)}`)
console.log(`  Running ${benchFiles.length} benchmark files`)
console.log('='.repeat(60))

let passed = 0
let failed = 0

for (const file of benchFiles) {
  console.log(`\n--- ${file} ---`)
  try {
    execSync(`npx tsx benchmarks/${file}`, {
      cwd: root,
      stdio: 'inherit',
      timeout: 600_000,
    })
    passed++
  } catch (err) {
    console.error(`  FAILED: ${(err as Error).message}`)
    failed++
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`  Done: ${passed} passed, ${failed} failed`)
console.log('='.repeat(60))

if (failed > 0) {
  process.exit(1)
}

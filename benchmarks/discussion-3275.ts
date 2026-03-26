#!/usr/bin/env node
/* eslint-disable no-console */
/// <reference types="node" />

import { performance } from 'node:perf_hooks'

import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'
import { selectAtom } from '../src/vanilla/utils.ts'

type ScenarioResult = number | { total: number; [k: string]: number }

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * Run warmup iterations, then measure a single timed run. Returns ms.
 * Mirrors the discussion's methodology.
 */
const measure = (fn: () => void, warmupCount = 3) => {
  for (let i = 0; i < warmupCount; i++) fn()
  if (global.gc) global.gc()
  const start = performance.now()
  fn()
  return performance.now() - start
}

const SCENARIOS: Record<string, (warmupCount: number) => ScenarioResult> = {
  // Scenario 1: Atom Creation (10,000 atoms)
  atomCreation(warmupCount) {
    return measure(() => {
      for (let i = 0; i < 10000; i++) atom(i)
    }, warmupCount)
  },

  // Scenario 2: Primitive Read/Write (10,000 set + 10,000 get)
  primitiveReadWrite(warmupCount) {
    const store = createStore()
    const a = atom(0)
    const unsub = store.sub(a, () => {})
    const writeTime = measure(() => {
      for (let i = 0; i < 10000; i++) store.set(a, i)
    }, warmupCount)
    const readTime = measure(() => {
      for (let i = 0; i < 10000; i++) store.get(a)
    }, warmupCount)
    unsub()
    return { writeTime, readTime, total: writeTime + readTime }
  },

  // Scenario 3: Derived Atom Chain (depth=100)
  derivedChain(warmupCount) {
    return measure(() => {
      const store = createStore()
      const base = atom(0)
      let prev = base
      for (let i = 0; i < 100; i++) {
        const p = prev
        prev = atom((get) => get(p) + 1)
      }
      const leaf = prev
      const unsub = store.sub(leaf, () => {})
      store.set(base, 1)
      unsub()
    }, warmupCount)
  },

  // Scenario 4: Wide Fan-Out (1 base → 1,000 derived)
  wideFanOut(warmupCount) {
    return measure(() => {
      const store = createStore()
      const base = atom(0)
      const derived = []
      for (let i = 0; i < 1000; i++) {
        derived.push(atom((get) => get(base) + i))
      }
      const unsubs = derived.map((d) => store.sub(d, () => {}))
      store.set(base, 1)
      unsubs.forEach((u) => u())
    }, warmupCount)
  },

  // Scenario 5: Diamond Pattern (base → 100 mid → 1 leaf)
  diamondPattern(warmupCount) {
    return measure(() => {
      const store = createStore()
      const base = atom(0)
      const mid = []
      for (let i = 0; i < 100; i++) {
        mid.push(atom((get) => get(base) + i))
      }
      const leaf = atom((get) => {
        let sum = 0
        for (const m of mid) sum += get(m)
        return sum
      })
      const unsub = store.sub(leaf, () => {})
      store.set(base, 1)
      unsub()
    }, warmupCount)
  },

  // Scenario 6: Subscription Churn (1,000 subscribe/unsubscribe)
  subscriptionChurn(warmupCount) {
    return measure(() => {
      const store = createStore()
      const atoms = []
      for (let i = 0; i < 1000; i++) atoms.push(atom(i))
      for (const a of atoms) {
        const unsub = store.sub(a, () => {})
        unsub()
      }
    }, warmupCount)
  },

  // Scenario 7: Computed Read without Mutation (10,000 reads)
  computedReadNoMutation(warmupCount) {
    const store = createStore()
    const base = atom(0)
    const derived = atom((get) => get(base) * 2)
    const unsub = store.sub(derived, () => {})
    store.get(derived) // prime
    const time = measure(() => {
      for (let i = 0; i < 10000; i++) store.get(derived)
    }, warmupCount)
    unsub()
    return time
  },

  // Scenario 8: selectAtom Performance (10,000 iterations)
  selectAtomPerf(warmupCount) {
    const store = createStore()
    const base = atom({ count: 0, name: 'test' })
    const countAtom = selectAtom(base, (v) => v.count)
    const unsub = store.sub(countAtom, () => {})
    store.get(countAtom) // prime
    const time = measure(() => {
      for (let i = 0; i < 10000; i++) {
        store.set(base, { count: i, name: 'test' })
        store.get(countAtom)
      }
    }, warmupCount)
    unsub()
    return time
  },
}

const main = async () => {
  const iterations = Number(process.env.ITERATIONS ?? 5)
  const warmupCount = Number(process.env.WARMUP ?? 3)

  const hasGc = typeof global.gc === 'function'
  if (!hasGc) {
    console.warn(
      'Warning: global.gc() is unavailable. Run with NODE_OPTIONS=--expose-gc for more consistent results.',
    )
  }

  const scenarioNames = Object.keys(SCENARIOS)
  const results: Record<
    string,
    { medianMs: number; runsMs: number[]; extra?: Record<string, number> }
  > = {}

  for (const name of scenarioNames) {
    const runs: number[] = []
    const extraAgg: Record<string, number[]> = {}
    for (let i = 0; i < iterations; i++) {
      const r = SCENARIOS[name]!(warmupCount)
      if (typeof r === 'number') {
        runs.push(r)
      } else {
        runs.push(r.total)
        for (const [k, v] of Object.entries(r)) {
          if (k === 'total') continue
          ;(extraAgg[k] ||= []).push(v)
        }
      }
    }
    const extra: Record<string, number> | undefined =
      Object.keys(extraAgg).length
        ? Object.fromEntries(
            Object.entries(extraAgg).map(([k, vs]) => [k, median(vs)]),
          )
        : undefined
    results[name] = { medianMs: median(runs), runsMs: runs, extra }
  }

  // GitHub-compatible markdown table
  console.log('| Scenario | Median (ms) | Notes |')
  console.log('|---|---:|---|')
  for (const name of scenarioNames) {
    const r = results[name]!
    const notes =
      name === 'primitiveReadWrite' && r.extra
        ? `write=${r.extra.writeTime.toFixed(3)}ms, read=${r.extra.readTime.toFixed(3)}ms`
        : ''
    console.log(`| ${name} | ${r.medianMs.toFixed(3)} | ${notes} |`)
  }
}

void main()

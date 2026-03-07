#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const createDerivedChain = (depth: number) => {
  const store = createStore()
  const baseAtom = atom(1)
  store.set(baseAtom, 1)
  let prev = baseAtom as ReturnType<typeof atom<number>>
  for (let i = 0; i < depth; ++i) {
    const dep = prev
    prev = atom((get) => get(dep) + 1)
  }
  return [store, baseAtom, prev] as const
}

const createWideDerived = (width: number) => {
  const store = createStore()
  const bases = Array.from({ length: width }, (_, i) => {
    const a = atom(i)
    store.set(a, i)
    return a
  })
  const derived = atom((get) => bases.reduce((sum, a) => sum + get(a), 0))
  return [store, bases, derived] as const
}

const main = async () => {
  await suite(
    'derived-read',
    // Deep chains: each read traverses the full chain, calling readAtomState per level
    ...[1, 5, 10, 50, 100].map((depth) =>
      add(`chain depth=${depth}`, () => {
        const [store, _base, derived] = createDerivedChain(depth)
        return () => store.get(derived)
      }),
    ),
    // Wide deps: single derived atom with many dependencies
    ...[10, 50, 100, 500].map((width) =>
      add(`wide deps=${width}`, () => {
        const [store, _bases, derived] = createWideDerived(width)
        return () => store.get(derived)
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'derived-read',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'derived-read',
      format: 'chart.html',
    }),
  )
}

main()

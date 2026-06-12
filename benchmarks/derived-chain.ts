#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import type { Atom } from '../src/vanilla/atom.js'
import { atom } from '../src/vanilla/atom.js'
import { createStore } from '../src/vanilla/store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  await suite(
    'derived-chain',
    ...[10, 50, 100, 200].map((depth) =>
      add(`depth=${depth}`, () => {
        return () => {
          const store = createStore()
          const base = atom(0)
          let prev: Atom<number> = base
          for (let i = 0; i < depth; i++) {
            const p = prev
            prev = atom((get) => get(p) + 1)
          }
          const leaf = prev
          const unsub = store.sub(leaf, () => {})
          store.set(base, 1)
          unsub()
        }
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'derived-chain',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'derived-chain',
      format: 'chart.html',
    }),
  )
}

main()

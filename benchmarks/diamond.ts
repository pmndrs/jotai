#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import type { Atom } from '../src/vanilla/atom.ts'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  await suite(
    'diamond',
    ...[10, 50, 100, 200].map((midCount) =>
      add(`base→${midCount} mid→leaf`, () => {
        return () => {
          const store = createStore()
          const base = atom(0)
          const mid: Atom<number>[] = []
          for (let i = 0; i < midCount; i++) {
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
        }
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'diamond',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'diamond',
      format: 'chart.html',
    }),
  )
}

main()

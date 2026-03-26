#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  await suite(
    'wide-fan-out',
    ...[100, 500, 1000].map((width) =>
      add(`1→${width} derived`, () => {
        return () => {
          const store = createStore()
          const base = atom(0)
          const derived = []
          for (let i = 0; i < width; i++) {
            derived.push(atom((get) => get(base) + i))
          }
          const unsubs = derived.map((d) => store.sub(d, () => {}))
          store.set(base, 1)
          unsubs.forEach((u) => u())
        }
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'wide-fan-out',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'wide-fan-out',
      format: 'chart.html',
    }),
  )
}

main()

#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'
import { selectAtom } from '../src/vanilla/utils/selectAtom.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  await suite(
    'select-atom',
    add('selectAtom 10k writes (relevant key)', () => {
      const store = createStore()
      const base = atom({ count: 0, name: 'test' })
      const countAtom = selectAtom(base, (v) => v.count)
      const unsub = store.sub(countAtom, () => {})
      store.get(countAtom) // prime
      return {
        fn: () => {
          for (let i = 0; i < 10_000; i++) {
            store.set(base, { count: i, name: 'test' })
            store.get(countAtom)
          }
        },
        teardown: () => unsub(),
      }
    }),
    add('selectAtom 10k writes (irrelevant key)', () => {
      const store = createStore()
      const base = atom({ count: 0, name: 'test' })
      const countAtom = selectAtom(base, (v) => v.count)
      const unsub = store.sub(countAtom, () => {})
      store.get(countAtom) // prime
      return {
        fn: () => {
          for (let i = 0; i < 10_000; i++) {
            store.set(base, { count: 0, name: `test-${i}` })
            store.get(countAtom)
          }
        },
        teardown: () => unsub(),
      }
    }),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'select-atom',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'select-atom',
      format: 'chart.html',
    }),
  )
}

main()

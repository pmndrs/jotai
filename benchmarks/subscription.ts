#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  // Suite 1: Subscribe/unsubscribe churn
  await suite(
    'sub-unsub',
    ...[100, 500, 1000].map((count) =>
      add(`sub/unsub ${count} atoms`, () => {
        return () => {
          const store = createStore()
          const atoms = []
          for (let i = 0; i < count; i++) atoms.push(atom(i))
          for (const a of atoms) {
            const unsub = store.sub(a, () => {})
            unsub()
          }
        }
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'sub-unsub',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'sub-unsub',
      format: 'chart.html',
    }),
  )

  // Suite 2: Write with all atoms subscribed (from original subscribe-write)
  await suite(
    'subscribe-write',
    ...[2, 3, 4].map((n) =>
      add(`atoms=${10 ** n}`, () => {
        const store = createStore()
        const target = atom(0)
        const unsubs: (() => void)[] = []
        for (let i = 0; i < 10 ** n; ++i) {
          const a = atom(i)
          store.get(a)
          unsubs.push(
            store.sub(a, () => {
              store.get(a)
            }),
          )
        }
        return {
          fn: () => store.set(target, (c) => c + 1),
          teardown: () => unsubs.forEach((u) => u()),
        }
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'subscribe-write',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'subscribe-write',
      format: 'chart.html',
    }),
  )
}

main()

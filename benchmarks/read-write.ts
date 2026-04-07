#!/usr/bin/env npx tsx

/// <reference types="node" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const main = async () => {
  // Suite 1: Batch read/write on a single mounted atom
  await suite(
    'read-write-batch',
    add('write 10k', () => {
      const store = createStore()
      const a = atom(0)
      const unsub = store.sub(a, () => {})
      return {
        fn: () => {
          for (let i = 0; i < 10_000; i++) {
            store.set(a, i)
          }
        },
        teardown: () => unsub(),
      }
    }),
    add('read 10k', () => {
      const store = createStore()
      const a = atom(0)
      const unsub = store.sub(a, () => {})
      return {
        fn: () => {
          for (let i = 0; i < 10_000; i++) {
            store.get(a)
          }
        },
        teardown: () => unsub(),
      }
    }),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'read-write-batch',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'read-write-batch',
      format: 'chart.html',
    }),
  )

  // Suite 2: Single read/write scaling by store size
  await suite(
    'store-size-scaling',
    ...[2, 3, 4, 5, 6].map((n) =>
      add(`read atoms=${10 ** n}`, () => {
        const store = createStore()
        const target = atom(0)
        for (let i = 0; i < 10 ** n; ++i) {
          const a = atom(i)
          store.set(a, i)
        }
        store.set(target, 0)
        return () => store.get(target)
      }),
    ),
    ...[2, 3, 4, 5, 6].map((n) =>
      add(`write atoms=${10 ** n}`, () => {
        const store = createStore()
        const target = atom(0)
        for (let i = 0; i < 10 ** n; ++i) {
          const a = atom(i)
          store.set(a, i)
        }
        store.set(target, 0)
        return () => store.set(target, (c) => c + 1)
      }),
    ),
    cycle(),
    complete(),
    save({
      folder: __dirname,
      file: 'store-size-scaling',
      format: 'json',
    }),
    save({
      folder: __dirname,
      file: 'store-size-scaling',
      format: 'chart.html',
    }),
  )
}

main()

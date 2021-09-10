#!/usr/bin/env npx ts-node

import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/core/atom'
import type { PrimitiveAtom } from '../src/core/atom'
import {
  READ_ATOM,
  SUBSCRIBE_ATOM,
  WRITE_ATOM,
  createStore,
} from '../src/core/store'

const cleanupFns = new Set<() => void>()
const cleanup = () => {
  cleanupFns.forEach((fn) => fn())
  cleanupFns.clear()
}

const createStateWithAtoms = (n: number) => {
  let targetAtom: PrimitiveAtom<number> | undefined
  const store = createStore()
  for (let i = 0; i < n; ++i) {
    const a = atom(i)
    if (!targetAtom) {
      targetAtom = a
    }
    store[READ_ATOM](a)
    const unsub = store[SUBSCRIBE_ATOM](a, () => {
      store[READ_ATOM](a)
    })
    cleanupFns.add(unsub)
  }
  if (!targetAtom) {
    throw new Error()
  }
  return [store, targetAtom] as const
}

const main = async () => {
  for (const n of [2, 3, 4, 5, 6]) {
    await suite(
      `subscribe-write-${n}`,
      add(`atoms=${10 ** n}`, () => {
        cleanup()
        const [store, targetAtom] = createStateWithAtoms(10 ** n)
        return () => store[WRITE_ATOM](targetAtom, (c) => c + 1)
      }),
      cycle(),
      complete(),
      save({
        folder: __dirname,
        file: `subscribe-write-${n}`,
        format: 'json',
      }),
      save({
        folder: __dirname,
        file: `subscribe-write-${n}`,
        format: 'chart.html',
      })
    )
  }
}

main()

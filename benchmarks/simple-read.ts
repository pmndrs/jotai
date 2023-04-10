#!/usr/bin/env npx ts-node

import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/vanilla/atom.ts'
import type { PrimitiveAtom } from '../src/vanilla/atom.ts'
import { createStore } from '../src/vanilla/store.ts'

const createStateWithAtoms = (n: number) => {
  let targetAtom: PrimitiveAtom<number> | undefined
  const store = createStore()
  for (let i = 0; i < n; ++i) {
    const a = atom(i)
    if (!targetAtom) {
      targetAtom = a
    }
    store.set(a, i)
  }
  if (!targetAtom) {
    throw new Error()
  }
  return [store, targetAtom] as const
}

const main = async () => {
  for (const n of [2, 3, 4, 5, 6]) {
    await suite(
      `simple-read-${n}`,
      add(`atoms=${10 ** n}`, () => {
        const [store, targetAtom] = createStateWithAtoms(10 ** n)
        return () => store.get(targetAtom)
      }),
      cycle(),
      complete(),
      save({
        folder: __dirname,
        file: `simple-read-${n}`,
        format: 'json',
      }),
      save({
        folder: __dirname,
        file: `simple-read-${n}`,
        format: 'chart.html',
      })
    )
  }
}

main()

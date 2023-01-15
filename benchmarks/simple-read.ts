#!/usr/bin/env npx ts-node

import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/core/atom'
import type { PrimitiveAtom } from '../src/core/atom'
import { READ_ATOM, createStore } from '../src/core/store'

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean
}
globalThis.__DEV__ = false

const createStateWithAtoms = (n: number) => {
  let targetAtom: PrimitiveAtom<number> | undefined
  const initialValues = new Map()
  for (let i = 0; i < n; ++i) {
    const a = atom(i)
    if (!targetAtom) {
      targetAtom = a
    }
    initialValues.set(a, i)
  }
  const store = createStore(initialValues)
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
        return () => store[READ_ATOM](targetAtom)
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

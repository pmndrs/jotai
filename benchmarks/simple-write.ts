#!/usr/bin/env npx ts-node

import { add, complete, cycle, save, suite } from 'benny'
import { atom } from '../src/core/atom'
import type { PrimitiveAtom } from '../src/core/atom'
import { createState, writeAtom } from '../src/core/vanilla'

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
  const state = createState(initialValues)
  if (!targetAtom) {
    throw new Error()
  }
  return [state, targetAtom] as const
}

const main = async () => {
  for (const n of [2, 3, 4, 5, 6]) {
    await suite(
      `simple-write-${n}`,
      add(`atoms=${10 ** n}`, () => {
        const [state, targetAtom] = createStateWithAtoms(10 ** n)
        return () => writeAtom(state, targetAtom, (c) => c + 1)
      }),
      cycle(),
      complete(),
      save({
        folder: __dirname,
        file: `simple-write-${n}`,
        format: 'json',
      }),
      save({
        folder: __dirname,
        file: `simple-write-${n}`,
        format: 'chart.html',
      })
    )
  }
}

main()

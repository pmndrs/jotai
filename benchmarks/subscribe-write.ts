#!/usr/bin/env npx ts-node

import { add, complete, cycle, save, suite } from 'benny'

import { PrimitiveAtom } from '../src/core/types'
import { atom } from '../src/core/atom'
import {
  createState,
  readAtom,
  writeAtom,
  subscribeAtom,
} from '../src/core/vanilla'

const cleanupFns = new Set<() => void>()
const cleanup = () => {
  cleanupFns.forEach((fn) => fn())
  cleanupFns.clear()
}

const createStateWithAtoms = (n: number) => {
  let targetAtom: PrimitiveAtom<number> | undefined
  const state = createState()
  for (let i = 0; i < n; ++i) {
    const a = atom(i)
    if (!targetAtom) {
      targetAtom = a
    }
    readAtom(state, a)
    const unsub = subscribeAtom(state, a, () => {
      readAtom(state, a)
    })
    cleanupFns.add(unsub)
  }
  if (!targetAtom) {
    throw new Error()
  }
  return [state, targetAtom] as const
}

const main = async () => {
  for (const n of [2, 3, 4, 5, 6]) {
    await suite(
      `subscribe-write-${n}`,
      add(`atoms=${10 ** n}`, () => {
        cleanup()
        const [state, targetAtom] = createStateWithAtoms(10 ** n)
        return () => writeAtom(state, targetAtom, (c) => c + 1)
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

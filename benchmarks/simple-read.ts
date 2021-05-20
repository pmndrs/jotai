// run with ts-node

import { add, complete, cycle, save, suite } from 'benny'

import { AnyAtom } from '../src/core/types'
import { atom } from '../src/core/atom'
import { createState, readAtom } from '../src/core/vanilla'

const createStateWithAtoms = (n: number) => {
  let targetAtom: AnyAtom | undefined
  const initialValues = new Map()
  for (let i = 0; i < n; ++i) {
    const a = atom(i)
    if (!targetAtom) {
      targetAtom = a
    }
    initialValues.set(a, i)
  }
  const state = createState(initialValues)
  return [state, targetAtom as AnyAtom] as const
}

const main = async () => {
  for (const n of [2, 3, 4, 5, 6]) {
    await suite(
      `simple-read-${n}`,
      add(`atoms=${10 ** n}`, () => {
        const [state, targetAtom] = createStateWithAtoms(10 ** n)
        return () => readAtom(state, targetAtom)
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

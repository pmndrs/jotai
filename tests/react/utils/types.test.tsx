import { it } from '@jest/globals'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should not allow invalid atom types when array is passed', () => {
  function Component() {
    const countAtom = atom(0)
    const activeAtom = atom(true)
    // @ts-expect-error TS2769
    useHydrateAtoms([
      [countAtom, 'foo'],
      [activeAtom, 0],
    ])
  }
  Component
})

import { expect, it } from 'vitest'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should not allow invalid atom types when array is passed', () => {
  function Component() {
    const countAtom = atom(0)
    const activeAtom = atom(true)
    // [ONLY-TS-3.8.3] @ts-ignore
    // @ts-expect-error TS2769 [SKIP-TS-3.9.7]
    useHydrateAtoms([
      [countAtom, 'foo'],
      [activeAtom, 0],
    ])
    // [ONLY-TS-3.8.3] @ts-ignore
    // @ts-expect-error TS2769 [SKIP-TS-3.9.7]
    useHydrateAtoms([
      [countAtom, 1],
      [activeAtom, 0],
    ])
    // @ts-expect-error TS2769 [SKIP-TS-3.9.7]
    useHydrateAtoms([
      [countAtom, true],
      [activeAtom, false],
    ])
    // Valid case
    useHydrateAtoms([
      [countAtom, 1],
      [activeAtom, true],
    ])
  }
  expect(Component).toBeDefined()
})

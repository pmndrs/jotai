import { expect, it } from 'vitest'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should not allow invalid atom types when array is passed', () => {
  function Component() {
    const countAtom = atom(0)
    const activeAtom = atom(true)
    // @ts-expect-error TS2769 [SKIP-TS-3.9.7]
    useHydrateAtoms([
      [countAtom, 'foo'],
      [activeAtom, 0],
    ])
    // @ts-expect-error TS2769 [SKIP-TS-5.0.4] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
    useHydrateAtoms([
      [countAtom, 1],
      // [ONLY-TS-5.0.4] [ONLY-TS-4.0.5] @ts-ignore
      [activeAtom, 0],
    ])
    // @ts-expect-error TS2769 [SKIP-TS-5.0.4] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
    useHydrateAtoms([
      // [ONLY-TS-5.0.4] [ONLY-TS-4.0.5] @ts-ignore
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

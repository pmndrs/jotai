import { expect, it } from 'vitest'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should not allow invalid atom types when array is passed', () => {
  function Component() {
    const countAtom = atom(0)
    const activeAtom = atom(true)
    // @ts-expect-error TS2769 [SKIP-TS-3.9.7]
    useHydrateAtoms([
      // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
      [countAtom, 'foo'],
      [activeAtom, 0],
    ])
    // @ts-expect-error TS2769 [SKIP-TS-5.0.4] [SKIP-TS-4.9.5] [SKIP-TS-4.8.4] [SKIP-TS-4.7.4] [SKIP-TS-4.6.4] [SKIP-TS-4.5.5] [SKIP-TS-4.4.4] [SKIP-TS-4.3.5] [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
    useHydrateAtoms([
      // [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
      [countAtom, 1],
      // [ONLY-TS-5.0.4] [ONLY-TS-4.9.5] [ONLY-TS-4.8.4] [ONLY-TS-4.7.4] [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] @ts-ignore
      [activeAtom, 0],
    ])
    // @ts-expect-error TS2769 [SKIP-TS-5.0.4] [SKIP-TS-4.9.5] [SKIP-TS-4.8.4] [SKIP-TS-4.7.4] [SKIP-TS-4.6.4] [SKIP-TS-4.5.5] [SKIP-TS-4.4.4] [SKIP-TS-4.3.5] [SKIP-TS-4.2.3] [SKIP-TS-4.1.5] [SKIP-TS-4.0.5] [SKIP-TS-3.9.7]
    useHydrateAtoms([
      // [ONLY-TS-5.0.4] [ONLY-TS-4.9.5] [ONLY-TS-4.8.4] [ONLY-TS-4.7.4] [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
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

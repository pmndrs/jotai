import { expect, it } from 'vitest'
import { useHydrateAtoms } from 'jotai/react/utils'
import { atom } from 'jotai/vanilla'

it('useHydrateAtoms should not allow invalid atom types when array is passed', () => {
  function Component() {
    const countAtom = atom(0)
    const activeAtom = atom(true)
    // Adding @ts-ignore for typescript 3.8 support
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // @ts-expect-error TS2769 [SKIP-TS-4.1.5] [SKIP-TS-4.0.5]
    useHydrateAtoms([
      [countAtom, 'foo'],
      [activeAtom, 0],
    ])
    // Adding @ts-ignore for typescript 3.8 support
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // @ts-expect-error TS2769 [SKIP-TS-4.1.5] [SKIP-TS-4.0.5]
    useHydrateAtoms([
      [countAtom, 1],
      [activeAtom, 0],
    ])
    // Adding @ts-ignore for typescript 3.8 support
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // @ts-expect-error TS2769 [SKIP-TS-4.1.5] [SKIP-TS-4.0.5]
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

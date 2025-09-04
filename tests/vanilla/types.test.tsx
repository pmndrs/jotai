import { expectType } from 'ts-expect'
import type { TypeOf } from 'ts-expect'
import { expect, it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type {
  Atom,
  ExtractAtomArgs,
  ExtractAtomResult,
  ExtractAtomValue,
  PrimitiveAtom,
  WritableAtom,
} from 'jotai/vanilla'

it('atom() should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    expectType<PrimitiveAtom<number>>(primitiveAtom)
    expectType<TypeOf<PrimitiveAtom<number>, typeof primitiveAtom>>(true)
    expectType<TypeOf<PrimitiveAtom<number | undefined>, typeof primitiveAtom>>(
      false,
    )

    // primitive atom without initial value
    const primitiveWithoutInitialAtom = atom<number | undefined>()
    expectType<PrimitiveAtom<number | undefined>>(primitiveWithoutInitialAtom)
    expectType<PrimitiveAtom<undefined>>(atom())

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    expectType<Atom<number>>(readonlyDerivedAtom)

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      },
    )
    expectType<WritableAtom<number, [number], void>>(readWriteDerivedAtom)

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<WritableAtom<null, [], void>>(writeonlyDerivedAtom)
  }
  expect(Component).toBeDefined()
})

it('type utils should work', () => {
  function Component() {
    const readWriteAtom = atom(
      (_get) => 1 as number,
      async (_get, _set, _value: string) => {},
    )
    expect(readWriteAtom).toBeDefined()

    const value: ExtractAtomValue<typeof readWriteAtom> = 1
    expectType<number>(value)

    const args: ExtractAtomArgs<typeof readWriteAtom> = ['']
    expectType<[string]>(args)

    const result: ExtractAtomResult<typeof readWriteAtom> = Promise.resolve()
    expectType<Promise<void>>(result)
  }
  expect(Component).toBeDefined()
})

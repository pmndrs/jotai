import { expectType } from 'ts-expect'
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

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    expectType<Atom<number>>(readonlyDerivedAtom)

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      }
    )
    expectType<WritableAtom<number, [number], void>>(readWriteDerivedAtom)

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<WritableAtom<null, [], void>>(writeonlyDerivedAtom)
  }
  Component
})

it('type utils should work', () => {
  function Component() {
    const readWriteAtom = atom(
      (_get) => 1 as number,
      async (_get, _set, _value: string) => {}
    )

    const value: ExtractAtomValue<typeof readWriteAtom> = 1
    expectType<number>(value)

    const args: ExtractAtomArgs<typeof readWriteAtom> = ['']
    expectType<[string]>(args)

    const result: ExtractAtomResult<typeof readWriteAtom> = Promise.resolve()
    expectType<Promise<void>>(result)
  }
  Component
})

it('init property should exist in primitiveAtom', () => {
  {
    const primitiveAtom = atom(1)
    expectType<number>(primitiveAtom.init)
  }
  {
    const primitiveAtom = atom(Promise.resolve(1))
    expectType<Promise<number>>(primitiveAtom.init)
  }
})

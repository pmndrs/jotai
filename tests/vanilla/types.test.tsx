// NOTE: Using variable assignment for type checking instead of expectTypeOf
// because TypeScript 3.8.3 doesn't support generic type arguments on untyped function calls.
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
    const _primitiveAtom: PrimitiveAtom<number> = primitiveAtom
    expect(_primitiveAtom).toBeDefined()

    // primitive atom without initial value
    const primitiveWithoutInitialAtom = atom<number | undefined>()
    const _primitiveWithoutInitialAtom: PrimitiveAtom<number | undefined> =
      primitiveWithoutInitialAtom
    expect(_primitiveWithoutInitialAtom).toBeDefined()

    const undefinedAtom = atom<undefined>()
    const _undefinedAtom: PrimitiveAtom<undefined> = undefinedAtom
    expect(_undefinedAtom).toBeDefined()

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    const _readonlyDerivedAtom: Atom<number> = readonlyDerivedAtom
    expect(_readonlyDerivedAtom).toBeDefined()

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      },
    )
    const _readWriteDerivedAtom: WritableAtom<number, [number], void> =
      readWriteDerivedAtom
    expect(_readWriteDerivedAtom).toBeDefined()

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    const _writeonlyDerivedAtom: WritableAtom<null, [], void> =
      writeonlyDerivedAtom
    expect(_writeonlyDerivedAtom).toBeDefined()
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
    const _value: number = value
    expect(_value).toBeDefined()

    const args: ExtractAtomArgs<typeof readWriteAtom> = ['']
    const _args: [string] = args
    expect(_args).toBeDefined()

    const result: ExtractAtomResult<typeof readWriteAtom> = Promise.resolve()
    const _result: Promise<void> = result
    expect(_result).toBeDefined()
  }
  expect(Component).toBeDefined()
})

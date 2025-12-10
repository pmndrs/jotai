import { expectTypeOf, it } from 'vitest'
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
  // primitive atom
  const primitiveAtom = atom(0)
  // NOTE: expectTypeOf is not available in TypeScript 4.0.5 and below, toExtend is not available in TypeScript 4.6.4 and below
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(primitiveAtom).toExtend<PrimitiveAtom<number>>()
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(primitiveAtom).not.toExtend<PrimitiveAtom<number | undefined>>()

  // primitive atom without initial value
  const primitiveWithoutInitialAtom = atom<number | undefined>()
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(primitiveWithoutInitialAtom).toExtend<
    PrimitiveAtom<number | undefined>
  >()

  const undefinedAtom = atom<undefined>()
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(undefinedAtom).toExtend<PrimitiveAtom<undefined>>()

  // read-only derived atom
  const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(readonlyDerivedAtom).toExtend<Atom<number>>()

  // read-write derived atom
  const readWriteDerivedAtom = atom(
    (get) => get(primitiveAtom),
    (get, set, value: number) => {
      set(primitiveAtom, get(primitiveAtom) + value)
    },
  )
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(readWriteDerivedAtom).toExtend<
    WritableAtom<number, [number], void>
  >()

  // write-only derived atom
  const writeonlyDerivedAtom = atom(null, (get, set) => {
    set(primitiveAtom, get(primitiveAtom) - 1)
  })
  // [ONLY-TS-4.6.4] [ONLY-TS-4.5.5] [ONLY-TS-4.4.4] [ONLY-TS-4.3.5] [ONLY-TS-4.2.3] [ONLY-TS-4.1.5] [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(writeonlyDerivedAtom).toExtend<WritableAtom<null, [], void>>()
})

it('type utils should work', () => {
  const readWriteAtom = atom(
    (_get) => 1 as number,
    async (_get, _set, _value: string) => {},
  )
  void readWriteAtom

  type ReadWriteAtom = typeof readWriteAtom
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf<ExtractAtomValue<ReadWriteAtom>>().toEqualTypeOf<number>()
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf<ExtractAtomArgs<ReadWriteAtom>>().toEqualTypeOf<[string]>()
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf<ExtractAtomResult<ReadWriteAtom>>().toEqualTypeOf<
    Promise<void>
  >()
})

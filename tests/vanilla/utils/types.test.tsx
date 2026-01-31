import { expectTypeOf, it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom, SetStateAction, WritableAtom } from 'jotai/vanilla'
import { selectAtom, unwrap } from 'jotai/vanilla/utils'

it('selectAtom() should return the correct types', () => {
  const doubleCount = (x: number) => x * 2
  const syncAtom = atom(0)
  const syncSelectedAtom = selectAtom(syncAtom, doubleCount)
  // NOTE: expectTypeOf is not available in TypeScript 4.0.5 and below
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(syncSelectedAtom).toEqualTypeOf<Atom<number>>()
})

it('unwrap() should return the correct types', () => {
  const getFallbackValue = () => -1
  const syncAtom = atom(0)
  const syncUnwrappedAtom = unwrap(syncAtom, getFallbackValue)
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(syncUnwrappedAtom).toEqualTypeOf<
    WritableAtom<number, [SetStateAction<number>], void>
  >()

  const asyncAtom = atom(Promise.resolve(0))
  const asyncUnwrappedAtom = unwrap(asyncAtom, getFallbackValue)
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(asyncUnwrappedAtom).toEqualTypeOf<
    WritableAtom<number, [SetStateAction<Promise<number>>], void>
  >()

  const maybeAsyncAtom = atom(Promise.resolve(0) as number | Promise<number>)
  const maybeAsyncUnwrappedAtom = unwrap(maybeAsyncAtom, getFallbackValue)
  // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
  expectTypeOf(maybeAsyncUnwrappedAtom).toEqualTypeOf<
    WritableAtom<number, [SetStateAction<number | Promise<number>>], void>
  >()
})

import { expectType } from 'ts-expect'
import type { TypeEqual } from 'ts-expect'
import { it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { unstable_unwrap as unwrap } from 'jotai/vanilla/utils'

it('unwrap() should return the correct types', () => {
  const getFallbackValue = () => -1
  const syncAtom = atom(0)
  const syncUnwrappedAtom = unwrap(syncAtom, getFallbackValue)
  expectType<TypeEqual<Atom<number>, typeof syncUnwrappedAtom>>(true)

  const asyncAtom = atom(Promise.resolve(0))
  const asyncUnwrappedAtom = unwrap(asyncAtom, getFallbackValue)
  expectType<TypeEqual<Atom<number>, typeof asyncUnwrappedAtom>>(true)

  const maybeAsyncAtom = atom(Promise.resolve(0) as number | Promise<number>)
  const maybeAsyncUnwrappedAtom = unwrap(maybeAsyncAtom, getFallbackValue)
  expectType<TypeEqual<Atom<number>, typeof maybeAsyncUnwrappedAtom>>(true)
})

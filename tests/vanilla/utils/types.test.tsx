import { expectType } from 'ts-expect'
import type { TypeEqual } from 'ts-expect'
import { expect, it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom, SetStateAction, WritableAtom } from 'jotai/vanilla'
import { selectAtom, unwrap } from 'jotai/vanilla/utils'

it('selectAtom() should return the correct types', () => {
  const doubleCount = (x: number) => x * 2
  const syncAtom = atom(0)
  const syncSelectedAtom = selectAtom(syncAtom, doubleCount)
  expect(syncSelectedAtom).toBeDefined()
  expectType<TypeEqual<Atom<number>, typeof syncSelectedAtom>>(true)
})

it('unwrap() should return the correct types', () => {
  const getFallbackValue = () => -1
  const syncAtom = atom(0)
  const syncUnwrappedAtom = unwrap(syncAtom, getFallbackValue)
  expect(syncUnwrappedAtom).toBeDefined()
  expectType<
    TypeEqual<
      WritableAtom<number, [SetStateAction<number>], void>,
      typeof syncUnwrappedAtom
    >
  >(true)

  const asyncAtom = atom(Promise.resolve(0))
  const asyncUnwrappedAtom = unwrap(asyncAtom, getFallbackValue)
  expect(asyncUnwrappedAtom).toBeDefined()
  expectType<
    TypeEqual<
      WritableAtom<number, [SetStateAction<Promise<number>>], void>,
      typeof asyncUnwrappedAtom
    >
  >(true)

  const maybeAsyncAtom = atom(Promise.resolve(0) as number | Promise<number>)
  const maybeAsyncUnwrappedAtom = unwrap(maybeAsyncAtom, getFallbackValue)
  expect(maybeAsyncUnwrappedAtom).toBeDefined()
  expectType<
    TypeEqual<
      WritableAtom<number, [SetStateAction<number | Promise<number>>], void>,
      typeof maybeAsyncUnwrappedAtom
    >
  >(true)
})

// NOTE: Using variable assignment for type checking instead of expectTypeOf
// because TypeScript 3.8.3 doesn't support generic type arguments on untyped function calls.
import { expect, it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom, SetStateAction, WritableAtom } from 'jotai/vanilla'
import { selectAtom, unwrap } from 'jotai/vanilla/utils'

it('selectAtom() should return the correct types', () => {
  const doubleCount = (x: number) => x * 2
  const syncAtom = atom(0)
  const syncSelectedAtom = selectAtom(syncAtom, doubleCount)
  expect(syncSelectedAtom).toBeDefined()
  const _syncSelectedAtom: Atom<number> = syncSelectedAtom
  expect(_syncSelectedAtom).toBeDefined()
})

it('unwrap() should return the correct types', () => {
  const getFallbackValue = () => -1
  const syncAtom = atom(0)
  const syncUnwrappedAtom = unwrap(syncAtom, getFallbackValue)
  expect(syncUnwrappedAtom).toBeDefined()
  const _syncUnwrappedAtom: WritableAtom<
    number,
    [SetStateAction<number>],
    void
  > = syncUnwrappedAtom
  expect(_syncUnwrappedAtom).toBeDefined()

  const asyncAtom = atom(Promise.resolve(0))
  const asyncUnwrappedAtom = unwrap(asyncAtom, getFallbackValue)
  expect(asyncUnwrappedAtom).toBeDefined()
  const _asyncUnwrappedAtom: WritableAtom<
    number,
    [SetStateAction<Promise<number>>],
    void
  > = asyncUnwrappedAtom
  expect(_asyncUnwrappedAtom).toBeDefined()

  const maybeAsyncAtom = atom(Promise.resolve(0) as number | Promise<number>)
  const maybeAsyncUnwrappedAtom = unwrap(maybeAsyncAtom, getFallbackValue)
  expect(maybeAsyncUnwrappedAtom).toBeDefined()
  const _maybeAsyncUnwrappedAtom: WritableAtom<
    number,
    [SetStateAction<number | Promise<number>>],
    void
  > = maybeAsyncUnwrappedAtom
  expect(_maybeAsyncUnwrappedAtom).toBeDefined()
})

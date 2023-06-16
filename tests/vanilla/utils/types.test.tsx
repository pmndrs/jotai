import { expectType } from 'ts-expect'
import type { TypeEqual } from 'ts-expect'
import { it } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { selectAtom } from 'jotai/vanilla/utils'

it('selectAtom() should return the correct types', () => {
  const doubleCount = (x: number) => x * 2
  function Component() {
    const syncAtom = atom(0)
    expectType<Atom<number>>(selectAtom(syncAtom, doubleCount))

    const asyncAtom = atom(Promise.resolve(0))
    expectType<Atom<Promise<number>>>(selectAtom(asyncAtom, doubleCount))

    const maybeAsyncAtom = atom(Promise.resolve(0) as number | Promise<number>)
    const selectedAtom = selectAtom(maybeAsyncAtom, doubleCount)
    expectType<TypeEqual<Atom<number | Promise<number>>, typeof selectedAtom>>(
      true
    )
  }
  Component
})

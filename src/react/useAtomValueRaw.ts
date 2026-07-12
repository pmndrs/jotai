'use client'

import { useDebugValue, useEffect, useReducer } from 'react'
import type { Atom, ExtractAtomValue } from '../vanilla.js'
import {
  createContinuablePromise,
  isPromiseLike,
} from './continuablePromise.js'
import { useStore } from './Provider.js'

type Store = ReturnType<typeof useStore>

type Options = Parameters<typeof useStore>[0]

export function useAtomValueRaw<Value>(
  atom: Atom<Value>,
  options?: Options,
): Value

export function useAtomValueRaw<AtomType extends Atom<unknown>>(
  atom: AtomType,
  options?: Options,
): ExtractAtomValue<AtomType>

export function useAtomValueRaw<Value>(atom: Atom<Value>, options?: Options) {
  const store = useStore(options)
  const [[valueFromReducer, storeFromReducer, atomFromReducer], rerender] =
    useReducer<readonly [Value, Store, typeof atom], undefined, []>(
      (prev) => {
        const nextValue = store.get(atom)
        if (
          Object.is(prev[0], nextValue) &&
          prev[1] === store &&
          prev[2] === atom
        ) {
          return prev
        }
        return [nextValue, store, atom]
      },
      undefined,
      () => [store.get(atom), store, atom],
    )
  let value = valueFromReducer
  if (storeFromReducer !== store || atomFromReducer !== atom) {
    rerender()
    value = store.get(atom)
  }
  useEffect(() => store.sub(atom, rerender), [store, atom])
  useDebugValue(value)
  if (isPromiseLike(value)) {
    return createContinuablePromise(store, value, () => store.get(atom))
  }
  return value
}

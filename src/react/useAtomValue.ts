/// <reference types="react/experimental" />

import ReactExports, { useDebugValue, useEffect, useReducer } from 'react'
import type { ReducerWithoutAction } from 'react'
import type { Atom, ExtractAtomValue } from 'jotai/vanilla'
import { useStore } from './Provider'

type Store = ReturnType<typeof useStore>

const isPromise = (x: unknown): x is Promise<unknown> => x instanceof Promise

const use =
  ReactExports.use ||
  (<T>(
    promise: Promise<T> & {
      status?: 'pending' | 'fulfilled' | 'rejected'
      value?: T
      reason?: unknown
    }
  ): T => {
    if (promise.status === 'pending') {
      throw promise
    } else if (promise.status === 'fulfilled') {
      return promise.value as T
    } else if (promise.status === 'rejected') {
      throw promise.reason
    } else {
      promise.status = 'pending'
      promise.then(
        (v) => {
          promise.status = 'fulfilled'
          promise.value = v
        },
        (e) => {
          promise.status = 'rejected'
          promise.reason = e
        }
      )
      throw promise
    }
  })

type Options = {
  store?: Store
}

export function useAtomValue<AtomType extends Atom<any>>(
  atom: AtomType,
  options?: Options
): Awaited<ExtractAtomValue<AtomType>> {
  type Value = ExtractAtomValue<AtomType>
  const store = useStore(options)
  const [[valueFromReducer, storeFromReducer, atomFromReducer], rerender] =
    useReducer<
      ReducerWithoutAction<readonly [Value, Store, AtomType]>,
      undefined
    >(
      (prev) => {
        const nextValue = store.get(atom)
        if (Object.is(prev[0], nextValue)) {
          return prev
        }
        return [nextValue, store, atom]
      },
      undefined,
      () => [store.get(atom), store, atom]
    )
  useEffect(() => {
    const unsub = store.sub(atom, rerender)
    rerender()
    return unsub
  }, [store, atom])
  let value = valueFromReducer
  if (storeFromReducer !== store || atomFromReducer !== atom) {
    rerender()
    value = store.get(atom)
  }
  useDebugValue(value)
  return isPromise(value) ? use(value) : (value as Awaited<Value>)
}

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
  sync?: boolean
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
      () => [store.get(atom), store, atom]
    )

  let value = valueFromReducer
  if (storeFromReducer !== store || atomFromReducer !== atom) {
    rerender()
    value = store.get(atom)
  }

  const sync = options?.sync
  useEffect(() => {
    const unsub = store.sub(atom, () => {
      try {
        const v = store.get(atom)
        if (!sync && v instanceof Promise) {
          // delay one tick
          setTimeout(rerender)
          return
        }
      } catch (e) {
        // ignored
      }
      rerender()
    })
    rerender()
    return unsub
  }, [store, atom, sync])

  useDebugValue(value)
  return isPromise(value) ? use(value) : (value as Awaited<Value>)
}

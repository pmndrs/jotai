/// <reference types="react/experimental" />

import ReactExports, { useDebugValue, useEffect, useReducer } from 'react'
import type { ReducerWithoutAction } from 'react'
import type { Atom, ExtractAtomValue } from '../vanilla.ts'
import { useStore } from './Provider.ts'

type Store = ReturnType<typeof useStore>

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any).then === 'function'

const use =
  ReactExports.use ||
  (<T>(
    promise: PromiseLike<T> & {
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
  delay?: number
}

export function useAtomValue<Value>(
  atom: Atom<Value>,
  options?: Options
): Awaited<Value>

export function useAtomValue<AtomType extends Atom<any>>(
  atom: AtomType,
  options?: Options
): Awaited<ExtractAtomValue<AtomType>>

export function useAtomValue<Value>(atom: Atom<Value>, options?: Options) {
  const store = useStore(options)

  const [[valueFromReducer, storeFromReducer, atomFromReducer], rerender] =
    useReducer<
      ReducerWithoutAction<readonly [Value, Store, typeof atom]>,
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

  const delay = options?.delay
  useEffect(() => {
    const unsub = store.sub(atom, () => {
      if (typeof delay === 'number') {
        // delay rerendering to wait a promise possibly to resolve
        setTimeout(rerender, delay)
        return
      }
      rerender()
    })
    rerender()
    return unsub
  }, [store, atom, delay])

  useDebugValue(value)
  return isPromiseLike(value) ? use(value) : (value as Awaited<Value>)
}

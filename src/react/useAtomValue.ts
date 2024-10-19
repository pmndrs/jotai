/// <reference types="react/experimental" />

import ReactExports, { useDebugValue, useEffect, useReducer } from 'react'
import type { ReducerWithoutAction } from 'react'
import type { Atom, ExtractAtomValue } from '../vanilla.ts'
import { useStore } from './Provider.ts'

type Store = ReturnType<typeof useStore>

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

const attachPromiseMeta = <T>(
  promise: PromiseLike<T> & {
    status?: 'pending' | 'fulfilled' | 'rejected'
    value?: T
    reason?: unknown
  },
) => {
  promise.status = 'pending'
  promise.then(
    (v) => {
      promise.status = 'fulfilled'
      promise.value = v
    },
    (e) => {
      promise.status = 'rejected'
      promise.reason = e
    },
  )
}

const use =
  ReactExports.use ||
  (<T>(
    promise: PromiseLike<T> & {
      status?: 'pending' | 'fulfilled' | 'rejected'
      value?: T
      reason?: unknown
    },
  ): T => {
    if (promise.status === 'pending') {
      throw promise
    } else if (promise.status === 'fulfilled') {
      return promise.value as T
    } else if (promise.status === 'rejected') {
      throw promise.reason
    } else {
      attachPromiseMeta(promise)
      throw promise
    }
  })

const continuablePromiseMap = new WeakMap<
  PromiseLike<unknown>,
  Promise<unknown>
>()

const createContinuablePromise = <T>(promise: PromiseLike<T>) => {
  let continuablePromise = continuablePromiseMap.get(promise)
  if (!continuablePromise) {
    continuablePromise = new Promise<T>((resolve, reject) => {
      let curr = promise
      const onFulfilled = (me: PromiseLike<T>) => (v: T) => {
        if (curr === me) {
          resolve(v)
        }
      }
      const onRejected = (me: PromiseLike<T>) => (e: unknown) => {
        if (curr === me) {
          reject(e)
        }
      }
      const registerCancelHandler = (p: PromiseLike<T>) => {
        if ('onCancel' in p && typeof p.onCancel === 'function') {
          p.onCancel((nextValue: PromiseLike<T> | T) => {
            if (import.meta.env?.MODE !== 'production' && nextValue === p) {
              throw new Error('[Bug] p is not updated even after cancelation')
            }
            if (isPromiseLike(nextValue)) {
              continuablePromiseMap.set(nextValue, continuablePromise!)
              curr = nextValue
              nextValue.then(onFulfilled(nextValue), onRejected(nextValue))
              registerCancelHandler(nextValue)
            } else {
              resolve(nextValue)
            }
          })
        }
      }
      promise.then(onFulfilled(promise), onRejected(promise))
      registerCancelHandler(promise)
    })
    continuablePromiseMap.set(promise, continuablePromise)
  }
  return continuablePromise
}

type Options = Parameters<typeof useStore>[0] & {
  delay?: number
}

export function useAtomValue<Value>(
  atom: Atom<Value>,
  options?: Options,
): Awaited<Value>

export function useAtomValue<AtomType extends Atom<unknown>>(
  atom: AtomType,
  options?: Options,
): Awaited<ExtractAtomValue<AtomType>>

export function useAtomValue<Value>(atom: Atom<Value>, options?: Options) {
  const store = useStore(options)

  if (atom === undefined || atom === null) {
    throw new Error('Atom is undefined or null')
  }

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
      () => [store.get(atom), store, atom],
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
        const value = store.get(atom)
        if (isPromiseLike(value)) {
          attachPromiseMeta(createContinuablePromise(value))
        }
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
  // The use of isPromiseLike is to be consistent with `use` type.
  // `instanceof Promise` actually works fine in this case.
  if (isPromiseLike(value)) {
    const promise = createContinuablePromise(value)
    return use(promise)
  }
  return value as Awaited<Value>
}

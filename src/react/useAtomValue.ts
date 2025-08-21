/// <reference types="react/experimental" />

import React, { useDebugValue, useEffect, useReducer, useRef } from 'react'
import { INTERNAL_registerAbortHandler as registerAbortHandler } from '../vanilla/internals.ts'
import type { Atom, ExtractAtomValue } from '../vanilla.ts'
import { useStore } from './Provider.ts'

type Store = ReturnType<typeof useStore>

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

const attachPromiseStatus = <T>(
  promise: PromiseLike<T> & {
    status?: 'pending' | 'fulfilled' | 'rejected'
    value?: T
    reason?: unknown
  },
) => {
  if (!promise.status) {
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
}

const use =
  React.use ||
  // A shim for older React versions
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
      attachPromiseStatus(promise)
      throw promise
    }
  })

const continuablePromiseMap = new WeakMap<
  PromiseLike<unknown>,
  Promise<unknown>
>()

const createContinuablePromise = <T>(
  promise: PromiseLike<T>,
  getValue: () => PromiseLike<T> | T,
) => {
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
      const onAbort = () => {
        try {
          const nextValue = getValue()
          if (isPromiseLike(nextValue)) {
            continuablePromiseMap.set(nextValue, continuablePromise!)
            curr = nextValue
            nextValue.then(onFulfilled(nextValue), onRejected(nextValue))
            registerAbortHandler(nextValue, onAbort)
          } else {
            resolve(nextValue)
          }
        } catch (e) {
          reject(e)
        }
      }
      promise.then(onFulfilled(promise), onRejected(promise))
      registerAbortHandler(promise, onAbort)
    })
    continuablePromiseMap.set(promise, continuablePromise)
  }
  return continuablePromise
}

type Options = Parameters<typeof useStore>[0] & {
  delay?: number
  unstable_promiseStatus?: boolean
  allowTearing?: boolean
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
  const {
    delay,
    unstable_promiseStatus: promiseStatus = !React.use,
    allowTearing = false,
  } = options || {}
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
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const unsub = store.sub(atom, () => {
      if (promiseStatus) {
        try {
          const value = store.get(atom)
          if (isPromiseLike(value)) {
            attachPromiseStatus(
              createContinuablePromise(value, () => store.get(atom)),
            )
          }
        } catch {
          // ignore
        }
      }
      if (typeof delay === 'number') {
        // delay rerendering to wait a promise possibly to resolve
        setTimeout(rerender, delay)
        return
      }
      rerender()
    })
    if (!allowTearing || !Object.is(valueRef.current, store.get(atom))) {
      rerender()
    }
    return unsub
  }, [store, atom, delay, promiseStatus, allowTearing])

  useDebugValue(value)
  if (isPromiseLike(value)) {
    const promise = createContinuablePromise(value, () => store.get(atom))
    if (promiseStatus) {
      attachPromiseStatus(promise)
    }
    return use(promise)
  }
  return value as Awaited<Value>
}

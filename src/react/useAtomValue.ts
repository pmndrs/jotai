/// <reference types="react/experimental" />

import ReactExports, { useDebugValue, useEffect, useReducer } from 'react'
import {
  INTERNAL_getBuildingBlocksRev1 as getBuildingBlocks,
  INTERNAL_initializeStoreHooks as initializeStoreHooks,
} from '../vanilla/internals.ts'
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

type ContinuablePromiseCache = WeakMap<PromiseLike<unknown>, Promise<unknown>>

type StoreHelpers = readonly [
  changedHook: { add(atom: Atom<unknown>, callback: () => void): () => void },
  promiseCache: {
    get(atom: Atom<unknown>): ContinuablePromiseCache | undefined
    set(atom: Atom<unknown>, value: ContinuablePromiseCache): void
  },
]

const StoreHelpersMap = new WeakMap<Store, StoreHelpers>()

const getStoreHelpers = (store: Store) => {
  let helpers = StoreHelpersMap.get(store)
  if (!helpers) {
    const buildingBlocks = getBuildingBlocks(store)
    const storeHooks = initializeStoreHooks(buildingBlocks[6])
    const changedHook = storeHooks.c
    const promiseCache = new WeakMap<Atom<unknown>, ContinuablePromiseCache>()
    helpers = [changedHook, promiseCache]
    StoreHelpersMap.set(store, helpers)
  }
  return helpers
}

const createContinuablePromise = <T>(
  store: Store,
  atom: Atom<PromiseLike<T> | T>,
  promise: PromiseLike<T>,
) => {
  const [changedHook, promiseCache] = getStoreHelpers(store)
  let continuablePromiseCache = promiseCache.get(atom)
  if (!continuablePromiseCache) {
    continuablePromiseCache = new WeakMap()
    promiseCache.set(atom, continuablePromiseCache)
  }
  let continuablePromise = continuablePromiseCache.get(promise)
  if (!continuablePromise) {
    continuablePromise = new Promise<T>((resolve, reject) => {
      let curr: PromiseLike<T> | undefined = promise
      const cleanup = changedHook.add(atom, () => {
        try {
          const nextValue = store.get(atom)
          if (isPromiseLike(nextValue)) {
            curr = nextValue
            nextValue.then(onFulfilled(nextValue), onRejected(nextValue))
          } else {
            curr = undefined
            resolve(nextValue as T)
            cleanup()
          }
        } catch (e) {
          curr = undefined
          reject(e)
          cleanup()
        }
      })
      const onFulfilled = (me: PromiseLike<T>) => (v: T) => {
        if (curr === me) {
          resolve(v)
          cleanup()
        }
      }
      const onRejected = (me: PromiseLike<T>) => (e: unknown) => {
        if (curr === me) {
          reject(e)
          cleanup()
        }
      }
      promise.then(onFulfilled(promise), onRejected(promise))
    })
    continuablePromiseCache.set(promise, continuablePromise)
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

  const delay = options?.delay
  useEffect(() => {
    const unsub = store.sub(atom, () => {
      if (typeof delay === 'number') {
        const value = store.get(atom)
        if (isPromiseLike(value)) {
          attachPromiseMeta(createContinuablePromise(store, atom, value))
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
    const promise = createContinuablePromise(store, atom, value)
    return use(promise)
  }
  return value as Awaited<Value>
}

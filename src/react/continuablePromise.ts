import { INTERNAL_getBuildingBlocksRev3 as INTERNAL_getBuildingBlocks } from '../vanilla/internals.js'
import type { INTERNAL_Store as Store } from '../vanilla/internals.js'

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as PromiseLike<unknown>)?.then === 'function'

const continuablePromiseMap = new WeakMap<
  PromiseLike<unknown>,
  Promise<unknown>
>()

export const createContinuablePromise = <T>(
  store: Store,
  promise: PromiseLike<T>,
  getValue: () => PromiseLike<T> | T,
): Promise<unknown> => {
  const buildingBlocks = INTERNAL_getBuildingBlocks(store)
  const registerAbortHandler = buildingBlocks[26]
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
            registerAbortHandler(buildingBlocks, store, nextValue, onAbort)
          } else {
            resolve(nextValue)
          }
        } catch (e) {
          reject(e)
        }
      }
      promise.then(onFulfilled(promise), onRejected(promise))
      registerAbortHandler(buildingBlocks, store, promise, onAbort)
    })
    continuablePromiseMap.set(promise, continuablePromise)
  }
  return continuablePromise
}

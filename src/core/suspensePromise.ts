const SUSPENSE_PROMISE = Symbol()

type SuspensePromiseExtra = {
  o: Promise<void> // original promise
  c: ((needsAbort?: boolean) => void) | null // cancel promise (null if already cancelled)
}

// Not exported for public API
export type SuspensePromise = Promise<void> & {
  [SUSPENSE_PROMISE]: SuspensePromiseExtra
}

export const isSuspensePromise = (
  promise: Promise<void>
): promise is SuspensePromise =>
  !!(promise as SuspensePromise)[SUSPENSE_PROMISE]

export const isSuspensePromiseAlreadyCancelled = (
  suspensePromise: SuspensePromise
) => !suspensePromise[SUSPENSE_PROMISE].c

export const cancelSuspensePromise = (suspensePromise: SuspensePromise) => {
  suspensePromise[SUSPENSE_PROMISE].c?.()
}

// Note: this is a special equality function
export const isEqualSuspensePromise = (
  oldSuspensePromise: SuspensePromise,
  newSuspensePromise: SuspensePromise
): boolean => {
  const oldOriginalPromise = oldSuspensePromise[SUSPENSE_PROMISE].o
  const newOriginalPromise = newSuspensePromise[SUSPENSE_PROMISE].o
  return (
    oldOriginalPromise === newOriginalPromise ||
    oldSuspensePromise === newOriginalPromise ||
    (isSuspensePromise(oldOriginalPromise) &&
      isEqualSuspensePromise(oldOriginalPromise, newSuspensePromise))
  )
}

export const createSuspensePromise = (
  basePromise: Promise<unknown>,
  promise: Promise<void>
): SuspensePromise => {
  const suspensePromiseExtra: SuspensePromiseExtra = {
    o: promise,
    c: null,
  }
  const suspensePromise = new Promise<void>((resolve) => {
    suspensePromiseExtra.c = (needsAbort?: boolean) => {
      suspensePromiseExtra.c = null
      resolve()
      if (needsAbort) {
        promiseAbortMap.get(basePromise)?.()
      }
    }
    promise.finally(suspensePromiseExtra.c)
  }) as SuspensePromise
  suspensePromise[SUSPENSE_PROMISE] = suspensePromiseExtra
  return suspensePromise
}

const promiseAbortMap = new WeakMap<Promise<unknown>, () => void>()

export const registerPromiseAbort = (
  basePromise: Promise<unknown>,
  abort: () => void
) => {
  promiseAbortMap.set(basePromise, abort)
}

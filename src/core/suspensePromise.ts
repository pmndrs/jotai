const SUSPENSE_PROMISE = Symbol()

type SuspensePromiseExtra = {
  b: Promise<unknown> // base promise
  o: Promise<void> // original promise
  c: (() => void) | null // cancel promise (null if already cancelled)
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
  const { b: basePromise, c: cancelPromise } = suspensePromise[SUSPENSE_PROMISE]
  if (cancelPromise) {
    cancelPromise()
    promiseAbortMap.get(basePromise)?.()
  }
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
    b: basePromise,
    o: promise,
    c: null,
  }
  const suspensePromise = new Promise<void>((resolve) => {
    suspensePromiseExtra.c = () => {
      suspensePromiseExtra.c = null
      resolve()
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

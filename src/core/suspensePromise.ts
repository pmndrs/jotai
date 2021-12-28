const SUSPENSE_PROMISE = Symbol()

export type SuspensePromise = Promise<void> & {
  [SUSPENSE_PROMISE]: {
    o: Promise<void> // original promise
    c: (() => void) | null // cancel promise (null if already cancelled)
  }
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
  promise: Promise<void>
): SuspensePromise => {
  const objectToAttach = {
    o: promise, // original promise
    c: null as (() => void) | null, // cancel promise
  }
  const suspensePromise = new Promise<void>((resolve) => {
    objectToAttach.c = () => {
      objectToAttach.c = null
      resolve()
    }
    promise.then(objectToAttach.c, objectToAttach.c)
  }) as SuspensePromise
  suspensePromise[SUSPENSE_PROMISE] = objectToAttach
  return suspensePromise
}

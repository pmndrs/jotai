export type RichPromise<T> = PromiseLike<T> & {
  status?: 'pending' | 'fulfilled' | 'rejected'
  value?: T
  reason?: unknown
}

export const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

export function isRichPromise(
  value: unknown,
): value is RichPromise<Awaited<typeof value>> {
  return isPromiseLike(value) && 'status' in value
}

export function actOnResolved<T>(
  promise: T,
  onFulfilled: (v: Awaited<T>, sync: boolean) => void,
  onRejected: (e: unknown, sync: boolean) => void,
  onResolved: (sync: boolean) => void,
) {
  if (isRichPromise(promise)) {
    if (promise.status === 'fulfilled') {
      onFulfilled(promise.value as Awaited<T>, true)
      onResolved(true)
      return
    }

    if (promise.status === 'rejected') {
      onRejected(promise.reason, true)
      onResolved(true)
      return
    }
  }

  if (isPromiseLike(promise)) {
    let sync = true
    promise.then(
      (v) => {
        onFulfilled(v as Awaited<T>, sync)
        onResolved(sync)
      },
      (e) => {
        onRejected(e, sync)
        onResolved(sync)
      },
    )
    sync = false
  } else {
    onFulfilled(promise as Awaited<T>, true)
    onResolved(true)
  }
}

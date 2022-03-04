import { atom } from 'jotai'
import type { Atom, Getter, WritableAtom } from 'jotai'

declare global {
  interface SymbolConstructor {
    readonly observable: symbol
  }
}

type Subscription = {
  unsubscribe: () => void
}

type Observer<T> = {
  next: (value: T) => void
  error: (error: unknown) => void
  complete: () => void
}

type ObservableLike<T> = {
  subscribe(observer: Observer<T>): Subscription
  subscribe(
    next: (value: T) => void,
    error?: (error: unknown) => void,
    complete?: () => void
  ): Subscription
  [Symbol.observable]?: () => ObservableLike<T> | undefined
}

type SubjectLike<T> = ObservableLike<T> & Observer<T>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => SubjectLike<TData>
): WritableAtom<TData, TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => ObservableLike<TData>
): Atom<TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => ObservableLike<TData> | SubjectLike<TData>
) {
  const observableResultAtom = atom((get) => {
    let settlePromise: ((data: TData | null, err?: unknown) => void) | null =
      null
    let observable = createObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }
    const dataAtom = atom<TData | Promise<TData>>(
      new Promise<TData>((resolve, reject) => {
        settlePromise = (data, err) => {
          if (err) {
            reject(err)
          } else {
            resolve(data as TData)
          }
        }
      })
    )
    let setData: (data: TData | Promise<TData>) => void = () => {
      throw new Error('setting data without mount')
    }
    const dataListener = (data: TData) => {
      if (settlePromise) {
        settlePromise(data)
        settlePromise = null
        if (subscription && !setData) {
          subscription.unsubscribe()
          subscription = null
        }
      } else {
        setData(data)
      }
    }
    const errorListener = (error: unknown) => {
      if (settlePromise) {
        settlePromise(null, error)
        settlePromise = null
        if (subscription && !setData) {
          subscription.unsubscribe()
          subscription = null
        }
      } else {
        setData(Promise.reject<TData>(error))
      }
    }
    let subscription: Subscription | null = null
    subscription = observable.subscribe(dataListener, errorListener)
    if (!settlePromise) {
      subscription.unsubscribe()
      subscription = null
    }
    dataAtom.onMount = (update) => {
      setData = update
      if (!subscription) {
        subscription = observable.subscribe(dataListener, errorListener)
      }
      return () => {
        subscription?.unsubscribe()
        subscription = null
      }
    }
    return { dataAtom, observable }
  })
  const observableAtom = atom(
    (get) => {
      const { dataAtom } = get(observableResultAtom)
      return get(dataAtom)
    },
    (get, _set, data: TData) => {
      const { observable } = get(observableResultAtom)
      if ('next' in observable) {
        observable.next(data)
      } else {
        throw new Error('observable is not subject')
      }
    }
  )
  return observableAtom
}

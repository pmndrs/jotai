import { atom } from 'jotai'
import type { Atom, WritableAtom, Getter } from 'jotai'

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
  [Symbol.observable]?: () => ObservableLike<T>
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
  type Result = { data: TData } | { error: unknown }
  const observableResultAtom = atom((get) => {
    let resolve: ((result: Result) => void) | null = null
    let observable = createObservable(get)
    if (observable[Symbol.observable]) {
      observable = (
        observable[Symbol.observable] as () => ObservableLike<TData>
      )()
    }
    const resultAtom = atom<Result | Promise<Result>>(
      new Promise<Result>((r) => {
        resolve = r
      })
    )
    resultAtom.scope = observableAtom.scope
    let setResult: (result: Result) => void = () => {
      throw new Error('setting data without mount')
    }
    const dataListener = (data: TData) => {
      if (resolve) {
        resolve({ data })
        resolve = null
      } else {
        setResult({ data })
      }
    }
    const errorListener = (error: unknown) => {
      if (resolve) {
        resolve({ error })
        resolve = null
      } else {
        setResult({ error })
      }
    }
    let subscription: Subscription | null = null
    subscription = observable.subscribe((data) => {
      dataListener(data)
      if (subscription && !setResult) {
        subscription.unsubscribe()
        subscription = null
      }
    }, errorListener)
    if (!resolve) {
      subscription.unsubscribe()
      subscription = null
    }
    resultAtom.onMount = (update) => {
      setResult = update
      if (!subscription)
        subscription = observable.subscribe(dataListener, errorListener)
      return () => subscription && subscription.unsubscribe()
    }
    return { resultAtom, observable }
  })
  const observableAtom = atom(
    (get) => {
      observableResultAtom.scope = observableAtom.scope
      const { resultAtom } = get(observableResultAtom)
      const result = get(resultAtom)
      if ('error' in result) {
        throw result.error
      }
      return result.data
    },
    (get, _set, data: TData) => {
      observableResultAtom.scope = observableAtom.scope
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

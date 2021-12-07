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

type InitialDataFunction<T> = () => T | undefined

export type AtomWithObservableOptions<TData> = {
  initialData?: TData | InitialDataFunction<TData>
}
export type CreateObservableOptions<TData> = {
  initialData?: TData
}

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => SubjectLike<TData>,
  options?: AtomWithObservableOptions<TData>
): WritableAtom<TData, TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => ObservableLike<TData>,
  options?: AtomWithObservableOptions<TData>
): Atom<TData>

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => ObservableLike<TData> | SubjectLike<TData>,
  options?: AtomWithObservableOptions<TData>
) {
  const observableResultAtom = atom((get) => {
    let settlePromise: ((data: TData | null, err?: unknown) => void) | null =
      null
    let observable = createObservable(get)
    const itself = observable[Symbol.observable]?.()

    if (itself) {
      observable = itself
    }

    function getInitialData() {
      const initialData = options?.initialData
      if (!initialData) {
        return
      }

      if (typeof initialData !== 'function') {
        return typeof initialData === 'function' ? initialData() : initialData
      }
    }

    const initialData = getInitialData()

    const dataAtom = atom<TData | Promise<TData>>(
      initialData === undefined
        ? new Promise<TData>((resolve, reject) => {
            settlePromise = (data, err) => {
              if (err) {
                reject(err)
              } else {
                resolve(data as TData)
              }
            }
          })
        : initialData
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
    subscription = (observable as ObservableLike<TData>).subscribe(
      dataListener,
      errorListener
    )
    if (!settlePromise && subscription) {
      subscription.unsubscribe()
      subscription = null
    }
    dataAtom.onMount = (update) => {
      setData = update
      if (!subscription) {
        subscription = (observable as ObservableLike<TData>).subscribe(
          dataListener,
          errorListener
        )
      }
      return () => subscription?.unsubscribe()
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

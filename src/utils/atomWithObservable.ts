import { atom } from 'jotai'
import type { Atom, Getter, WritableAtom } from 'jotai'

function isObservable(observable) {
  return (
    typeof observable === 'object' && typeof observable.subscribe === 'function'
  )
}

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

export type AtomWithObservableOptions<TData, TObservable> = {
  initialData?: TData | InitialDataFunction<TData>
  enabled?: boolean
  observableFn: () => TObservable
}
export type CreateObservableOptions<Options, TData> =
  | Options
  | ((get: Getter) => ObservableLike<TData>)

export function atomWithObservable<TData>(
  createObservable: CreateObservableOptions<
    AtomWithObservableOptions<TData, SubjectLike<TData>>,
    TData
  >
): WritableAtom<TData, TData>

export function atomWithObservable<TData>(
  createObservable: CreateObservableOptions<
    AtomWithObservableOptions<TData, ObservableLike<TData>>,
    TData
  >
): Atom<TData>

export function atomWithObservable<TData>(
  createObservable: CreateObservableOptions<
    AtomWithObservableOptions<
      TData,
      ObservableLike<TData> | SubjectLike<TData>
    >,
    TData
  >
) {
  const observableResultAtom = atom((get) => {
    let settlePromise: ((data: TData | null, err?: unknown) => void) | null =
      null
    let observable =
      typeof createObservable === 'function'
        ? createObservable(get)
        : { enabled: true, ...createObservable }

    function getInitialData() {
      const initialData = (
        observable as AtomWithObservableOptions<
          TData,
          ObservableLike<TData> | SubjectLike<TData>
        >
      ).initialData

      if (typeof initialData !== 'function') {
        return typeof initialData === 'function' ? initialData() : initialData
      }
    }

    function getEnabled() {
      return !isObservable(observable)
        ? (
            observable as AtomWithObservableOptions<
              TData,
              ObservableLike<TData>
            >
          ).enabled
        : true
    }

    const initialData = getInitialData()
    const enabled = getEnabled()

    const itself: ObservableLike<TData> = isObservable(observable)
      ? (observable as ObservableLike<TData>)[Symbol.observable]?.()
      : (
          observable as AtomWithObservableOptions<
            TData,
            ObservableLike<TData> | SubjectLike<TData>
          >
        ).observableFn?.()

    if (itself) {
      observable = itself
    }

    const dataAtom = atom<TData | Promise<TData>>(
      enabled &&
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
    if (enabled) {
      subscription = (observable as ObservableLike<TData>).subscribe(
        dataListener,
        errorListener
      )
    }
    if (!settlePromise && subscription) {
      subscription.unsubscribe()
      subscription = null
    }
    dataAtom.onMount = (update) => {
      setData = update
      if (!subscription && enabled) {
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

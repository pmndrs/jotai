import { atom } from 'jotai'
import type { Atom, Getter, WritableAtom } from 'jotai'

type Timeout = ReturnType<typeof setTimeout>
type AnyError = unknown

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
  error: (error: AnyError) => void
  complete: () => void
}

type ObservableLike<T> = {
  [Symbol.observable]?: () => ObservableLike<T> | undefined
  subscribe(observer: Partial<Observer<T>>): Subscription
} & (
  | never
  | {
      // Overload function to make typing happy
      subscribe(next: (value: T) => void): Subscription
    }
)

type SubjectLike<T> = ObservableLike<T> & Observer<T>

type Options<Data> = {
  initialValue?: Data | (() => Data)
  unstable_timeout?: number
}

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => SubjectLike<Data>,
  options?: Options<Data>
): WritableAtom<Data, Data>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => ObservableLike<Data>,
  options?: Options<Data>
): Atom<Data>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => ObservableLike<Data> | SubjectLike<Data>,
  options?: Options<Data>
) {
  const observableResultAtom = atom((get) => {
    let observable = getObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }

    type Result = { d: Data } | { e: AnyError }
    let resolve: ((result: Result) => void) | undefined
    const makePending = () =>
      new Promise<Result>((r) => {
        resolve = r
      })
    const initialResult: Result | Promise<Result> =
      options && 'initialValue' in options
        ? {
            d:
              typeof options.initialValue === 'function'
                ? (options.initialValue as () => Data)()
                : (options.initialValue as Data),
          }
        : makePending()

    let setResult: ((result: Result) => void) | undefined
    let lastResult: Result | undefined
    const listener = (result: Result) => {
      lastResult = result
      resolve?.(result)
      setResult?.(result)
    }

    let subscription: Subscription | undefined
    let timer: Timeout | undefined
    const isNotMounted = () => !setResult
    const start = () => {
      if (subscription) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
      subscription = observable.subscribe({
        next: (d) => listener({ d }),
        error: (e) => listener({ e }),
      })
      if (isNotMounted() && options?.unstable_timeout) {
        timer = setTimeout(() => {
          if (subscription) {
            subscription.unsubscribe()
            subscription = undefined
          }
        }, options.unstable_timeout)
      }
    }
    start()

    const resultAtom = atom(lastResult || initialResult)
    resultAtom.onMount = (update) => {
      setResult = update
      if (lastResult) {
        update(lastResult)
      }
      if (subscription) {
        clearTimeout(timer)
      } else {
        start()
      }
      return () => {
        setResult = undefined
        if (subscription) {
          subscription.unsubscribe()
          subscription = undefined
        }
      }
    }
    return [resultAtom, observable, makePending, start, isNotMounted] as const
  })

  const observableAtom = atom(
    (get) => {
      const [resultAtom] = get(observableResultAtom)
      const result = get(resultAtom)
      if ('e' in result) {
        throw result.e
      }
      return result.d
    },
    (get, set, data: Data) => {
      const [resultAtom, observable, makePending, start, isNotMounted] =
        get(observableResultAtom)
      if ('next' in observable) {
        if (isNotMounted()) {
          set(resultAtom, makePending())
          start()
        }
        observable.next(data)
      } else {
        throw new Error('observable is not subject')
      }
    }
  )

  return observableAtom
}

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
  subscribe(observer: Observer<T>): Subscription
  subscribe(
    next: (value: T) => void,
    error?: (error: AnyError) => void,
    complete?: () => void
  ): Subscription
  [Symbol.observable]?: () => ObservableLike<T> | undefined
}

type SubjectLike<T> = ObservableLike<T> & Observer<T>

type Options<Data> = {
  initialValue?: Data | (() => Data)
  timeout?: number
}

export function atomWithObservable<Data>(
  createObservable: (get: Getter) => SubjectLike<Data>,
  options?: Options<Data>
): WritableAtom<Data, Data>

export function atomWithObservable<Data>(
  createObservable: (get: Getter) => ObservableLike<Data>,
  options?: Options<Data>
): Atom<Data>

export function atomWithObservable<Data>(
  createObservable: (get: Getter) => ObservableLike<Data> | SubjectLike<Data>,
  options?: Options<Data>
) {
  const observableResultAtom = atom((get) => {
    let observable = createObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }

    type Result = { d: Data } | { e: AnyError }
    let resolve: ((result: Result) => void) | null = null
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

    let setResult: ((result: Result) => void) | null = null
    let lastResult: Result | undefined
    const listener = (result: Result) => {
      lastResult = result
      resolve?.(result)
      setResult?.(result)
    }

    let subscription: Subscription | null = null
    let timer: Timeout | undefined
    const isNotMounted = () => !setResult
    const start = () => {
      if (subscription) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
      subscription = observable.subscribe(
        (d) => listener({ d }),
        (e) => listener({ e })
      )
      if (isNotMounted() && options?.timeout) {
        timer = setTimeout(() => {
          if (subscription) {
            subscription.unsubscribe()
            subscription = null
          }
        }, options.timeout)
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
        setResult = null
        if (subscription) {
          subscription.unsubscribe()
          subscription = null
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

import { atom } from '../../vanilla.ts'
import type { Atom, Getter, WritableAtom } from '../../vanilla.ts'

type Timeout = ReturnType<typeof setTimeout>
type AnyError = unknown

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
} & (
  | {
      subscribe(observer: Observer<T>): Subscription
    }
  | {
      subscribe(observer: Partial<Observer<T>>): Subscription
    }
  | {
      subscribe(observer: Partial<Observer<T>>): Subscription
      // Overload function to make typing happy
      subscribe(next: (value: T) => void): Subscription
    }
)

type SubjectLike<T> = ObservableLike<T> & Observer<T>

type Options<Data> = {
  initialValue?: Data | (() => Data)
  unstable_timeout?: number
}

type OptionsWithInitialValue<Data> = {
  initialValue: Data | (() => Data)
  unstable_timeout?: number
}

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => SubjectLike<Data>,
  options: OptionsWithInitialValue<Data>,
): WritableAtom<Data, [Data], void>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => SubjectLike<Data>,
  options?: Options<Data>,
): WritableAtom<Data | Promise<Data>, [Data], void>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => ObservableLike<Data>,
  options: OptionsWithInitialValue<Data>,
): Atom<Data>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => ObservableLike<Data>,
  options?: Options<Data>,
): Atom<Data | Promise<Data>>

export function atomWithObservable<Data>(
  getObservable: (get: Getter) => ObservableLike<Data> | SubjectLike<Data>,
  options?: Options<Data>,
) {
  type Result = { d: Data } | { e: AnyError }
  const returnResultData = (result: Result) => {
    if ('e' in result) {
      throw result.e
    }
    return result.d
  }

  const observableResultAtom = atom((get) => {
    let observable = getObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }

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
    const unsubscribe = () => {
      if (subscription) {
        subscription.unsubscribe()
        subscription = undefined
      }
    }
    const start = () => {
      if (subscription) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }
      subscription = observable.subscribe({
        next: (d) => listener({ d }),
        error: (e) => listener({ e }),
        complete: () => {},
      })
      if (isNotMounted() && options?.unstable_timeout) {
        timer = setTimeout(unsubscribe, options.unstable_timeout)
      }
    }
    start()

    const resultAtom = atom(lastResult || initialResult)

    if (import.meta.env?.MODE !== 'production') {
      resultAtom.debugPrivate = true
    }

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
        if (options?.unstable_timeout) {
          timer = setTimeout(unsubscribe, options.unstable_timeout)
        } else {
          unsubscribe()
        }
      }
    }
    return [resultAtom, observable, makePending, start, isNotMounted] as const
  })

  if (import.meta.env?.MODE !== 'production') {
    observableResultAtom.debugPrivate = true
  }

  const observableAtom = atom(
    (get) => {
      const [resultAtom] = get(observableResultAtom)
      const result = get(resultAtom)
      if (result instanceof Promise) {
        return result.then(returnResultData)
      }
      return returnResultData(result)
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
    },
  )

  return observableAtom
}

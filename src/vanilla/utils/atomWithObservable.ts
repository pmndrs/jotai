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

type Result<Data> = { d: Data } | { e: AnyError }

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
  const EMPTY = Symbol()

  const observableResultAtom = atom((get) => {
    let observable = getObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }

    // TODO: replace with https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
    // once CI Node version is bump to 22+
    let resolve: (value: Data | PromiseLike<Data>) => void
    let reject: (reason?: any) => void
    const promise = new Promise<Data>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })

    const initialResult =
      options && 'initialValue' in options
        ? typeof options.initialValue === 'function'
          ? (options.initialValue as () => Data)()
          : (options.initialValue as Data)
        : promise

    const resultAtom = atom<Result<Data | Promise<Data>>>({ d: initialResult })

    let preMountData: Data | typeof EMPTY = EMPTY

    let setResult: ((result: Result<Data | Promise<Data>>) => void) | undefined
    const isMounted = () => setResult !== undefined

    let subscription: Subscription | undefined
    let timer: Timeout | undefined
    const startSubscription = () => {
      if (subscription !== undefined) {
        clearTimeout(timer)
        subscription.unsubscribe()
      }

      subscription = observable.subscribe({
        next: (value) => {
          resolve(value)
          preMountData = value
          setResult?.({ d: value })
        },
        error: (error) => {
          reject(error)
          setResult?.({ e: error })
        },
        complete: () => {},
      })

      if (!isMounted() && options?.unstable_timeout) {
        timer = setTimeout(() => {
          if (subscription) {
            subscription.unsubscribe()
            subscription = undefined
          }
        }, options.unstable_timeout)
      }
    }

    if (import.meta.env?.MODE !== 'production') {
      resultAtom.debugPrivate = true
    }

    startSubscription()

    resultAtom.onMount = (setAtom) => {
      setResult = setAtom

      if (preMountData !== EMPTY) {
        setAtom({ d: preMountData })
      }

      if (subscription === undefined) {
        startSubscription()
      } else {
        clearTimeout(timer)
      }

      return () => {
        subscription?.unsubscribe()
        subscription = undefined
      }
    }

    return { atom: resultAtom, observable }
  })

  return atom(
    (get) => {
      const unwrapResult = (result: Result<unknown>) => {
        if ('e' in result) {
          throw result.e
        }

        return result.d
      }

      const result = get(get(observableResultAtom).atom)

      if (result instanceof Promise) {
        return result.then(unwrapResult)
      }

      return unwrapResult(result)
    },
    (get, _, data: Data) => {
      const observable = get(observableResultAtom).observable
      if ('next' in observable) {
        observable.next(data)
      } else {
        throw new Error('observable is not subject')
      }
    },
  )
}

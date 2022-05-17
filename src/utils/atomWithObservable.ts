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

type InitialValueFunction<T> = () => T | undefined

type AtomWithObservableOptions<TData> = {
  initialValue?: TData | InitialValueFunction<TData>
  timeout?: number | false
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
    let observable = createObservable(get)
    const itself = observable[Symbol.observable]?.()
    if (itself) {
      observable = itself
    }

    // To differentiate beetwen no value was emitted and `undefined` was emitted,
    // this symbol is used
    const NotEmitted = Symbol()
    type NotEmitted = typeof NotEmitted

    let resolveEmittedInitialValue:
      | ((data: TData | Promise<TData>) => void)
      | null = null
    let initialEmittedValue: Promise<TData> | TData | undefined =
      options?.initialValue === undefined
        ? new Promise((resolve) => {
            resolveEmittedInitialValue = resolve
          })
        : undefined
    let initialValueWasEmitted = false
    let initialEmittedValueTimer: NodeJS.Timeout | null = null

    let emittedValueBeforeMount: TData | Promise<TData> | NotEmitted =
      NotEmitted
    let isSync = true
    let setData: (data: TData | Promise<TData>) => void = (data) => {
      // First we set the initial value (if not other initialValue was provided)
      // All the following data is saved in a variable so it doesn't get lost before the mount
      if (options?.initialValue === undefined && !initialValueWasEmitted) {
        if (isSync) {
          initialEmittedValue = data
        }
        resolveEmittedInitialValue?.(data)
        initialValueWasEmitted = true
        resolveEmittedInitialValue = null
        if (initialEmittedValueTimer) clearTimeout(initialEmittedValueTimer)
      } else {
        emittedValueBeforeMount = data
      }
    }

    const dataListener = (data: TData) => {
      setData(data)
    }

    const errorListener = (error: unknown) => {
      setData(Promise.reject<TData>(error))
    }

    let subscription: Subscription | null = null
    let initialValue:
      | TData
      | Promise<TData>
      | InitialValueFunction<TData>
      | undefined
    let isMounted = false
    if (options?.initialValue !== undefined) {
      initialValue = getInitialValue(options)
    } else {
      subscription = observable.subscribe(dataListener, errorListener)
      isSync = false
      // Unsubscribe after an timeout, in case the `onMount` method was never called
      // and the subscription is still pending
      if (options?.timeout !== false) {
        initialEmittedValueTimer = setTimeout(() => {
          initialEmittedValueTimer = null
          if (!isMounted) subscription?.unsubscribe()
        }, options?.timeout ?? 10_000)
      }
      initialValue = initialEmittedValue
    }

    const dataAtom = atom(initialValue)
    dataAtom.onMount = (update) => {
      isMounted = true
      setData = update
      if (emittedValueBeforeMount !== NotEmitted) {
        update(emittedValueBeforeMount)
      }
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

function getInitialValue<TData>(options: AtomWithObservableOptions<TData>) {
  const initialValue = options.initialValue
  return initialValue instanceof Function ? initialValue() : initialValue
}

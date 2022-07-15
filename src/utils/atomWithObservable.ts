import { atom } from 'jotai'
import type { Atom, Getter, WritableAtom } from 'jotai'

declare global {
  interface SymbolConstructor {
    readonly observable: symbol
  }
}

interface Subscription {
  unsubscribe: () => void
}

interface Observer<T> {
  next: (value: T) => void
  error: (error: unknown) => void
  complete: () => void
}

interface ObservableLike<T> {
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

interface AtomWithObservableOptions<TData> {
  initialValue?: TData | InitialValueFunction<TData>
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
    const EMPTY = Symbol()

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

    let emittedValueBeforeMount: TData | Promise<TData> | typeof EMPTY = EMPTY
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
    if (options?.initialValue !== undefined) {
      initialValue = getInitialValue(options)
    } else {
      // FIXME
      // There is the potential for memory leaks in this implementation.
      //
      // If the observable doesn't emit an initial value before the component that uses the atom gets destroyed,
      // the onMount function never gets called and therefore the subscription never gets cleaned up.
      //
      // Unfortunately, currently there is no good way to prevent this issue (as of 2022-05-23).
      // Timeouts may lead to an endless loading state, if the subscription get's cleaned up too quickly.
      //
      // Discussion: https://github.com/pmndrs/jotai/pull/1170
      subscription = observable.subscribe(dataListener, errorListener)
      initialValue = initialEmittedValue
    }
    isSync = false

    const dataAtom = atom(initialValue)
    dataAtom.onMount = (update) => {
      setData = update
      if (emittedValueBeforeMount !== EMPTY) {
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
    (get, set, data: TData) => {
      const { dataAtom, observable } = get(observableResultAtom)
      if ('next' in observable) {
        // FIXME one-time subscription is only necessary if not mounted yet
        let subscription: Subscription | null = null
        const callback = (data: TData) => {
          set(dataAtom, data)
          subscription?.unsubscribe()
        }
        subscription = observable.subscribe(callback)
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

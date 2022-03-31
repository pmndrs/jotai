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

    const dataAtom = atom(
      options?.initialValue
        ? getInitialValue(options)
        : firstValueFrom(observable)
    )
    let setData: (data: TData | Promise<TData>) => void = () => {
      throw new Error('setting data without mount')
    }
    const dataListener = (data: TData) => {
      setData(data)
    }
    const errorListener = (error: unknown) => {
      setData(Promise.reject<TData>(error))
    }
    let subscription: Subscription | null = null

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

function getInitialValue<TData>(options: AtomWithObservableOptions<TData>) {
  const initialValue = options.initialValue
  return initialValue instanceof Function ? initialValue() : initialValue
}

// Limitation
// Unless the source emit a new value,
// the subscription will never be destroyed.
// So, there's a risk of memory leaks, especially because
// the atom `read` function can be called multiple times without mounting.
// Ref: https://github.com/pmndrs/jotai/pull/1058
// (This was present even before #1058.)
function firstValueFrom<T>(source: ObservableLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let resolved = false
    const subscription = source.subscribe({
      next: (value) => {
        resolve(value)
        resolved = true
        if (subscription) {
          subscription.unsubscribe()
        }
      },
      error: reject,
      complete: () => {
        reject()
      },
    })

    if (resolved) {
      // If subscription was resolved synchronously
      subscription.unsubscribe()
    }
  })
}

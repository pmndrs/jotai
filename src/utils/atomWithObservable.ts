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

// FIXME There are two fatal issues in the current implememtation.
// See also: https://github.com/pmndrs/jotai/pull/1058
// - There's a risk of memory leaks.
//   Unless the source emit a new value,
//   the subscription will never be destroyed.
//   atom `read` function can be called multiple times without mounting.
//   This issue has existed even before #1058.
// - The second value before mounting the atom is dropped.
//   There's no guarantee that `onMount` is invoked in a short period.
//   So, by the time we invoke `subscribe`, the value can be changed.
//   Before #1058, an error was thrown, but currently it's silently dropped.
function firstValueFrom<T>(source: ObservableLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let resolved = false
    let isSync = true
    const subscription = source.subscribe({
      next: (value) => {
        resolve(value)
        resolved = true
        if (!isSync) {
          subscription.unsubscribe()
        }
      },
      error: reject,
      complete: () => {
        reject()
      },
    })
    isSync = false

    if (resolved) {
      // If subscription was resolved synchronously
      subscription.unsubscribe()
    }
  })
}

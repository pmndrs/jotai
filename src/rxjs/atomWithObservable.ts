import { Observable } from 'rxjs'
import { Atom, atom } from 'jotai'
import type { Getter } from '../core/types'

const createPending = <T>() => {
  const pending: {
    fulfilled: boolean
    promise?: Promise<T>
    resolve?: (data: T) => void
  } = {
    fulfilled: false,
  }
  pending.promise = new Promise<T>((resolve) => {
    pending.resolve = (data: T) => {
      resolve(data)
      pending.fulfilled = true
    }
  })
  return pending as {
    fulfilled: boolean
    promise: Promise<T>
    resolve: (data: T) => void
  }
}

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => Observable<TData>
): Atom<TData> {
  const pendingAtom = atom(createPending<TData>())
  const dataAtom = atom<TData | null>(null)
  const observableAtom = atom((get) => {
    const observable = createObservable(get)
    const observerAtom = atom(null, (get, set, data: TData) => {
      set(dataAtom, data)
      const pending = get(pendingAtom)
      if (!pending.fulfilled) {
        pending.resolve(data)
      }
    })
    observerAtom.onMount = (dispatch) => {
      const subscription = observable.subscribe(dispatch)
      // XXX no error handling
      return () => {
        subscription.unsubscribe()
      }
    }
    return observerAtom
  })
  const observableDataAtom = atom((get) => {
    const observerAtom = get(observableAtom)
    get(observerAtom) // use it here
    const data = get(dataAtom)
    const pending = get(pendingAtom)
    if (!pending.fulfilled) {
      return pending.promise
    }
    // we are sure that data is not null
    return data as TData
  })
  return observableDataAtom
}

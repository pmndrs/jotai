import { Observable } from 'rxjs'
import { atom } from 'jotai'
import type { Atom, Getter } from 'jotai'

export function atomWithObservable<TData>(
  createObservable: (get: Getter) => Observable<TData>
): Atom<TData> {
  const dataAtom = atom<TData | Promise<TData>>(
    new Promise<TData>(() => {}) // infinite pending
  )
  const observableAtom = atom((get) => {
    const observable = createObservable(get)
    const observerAtom = atom(null, (_get, set, data: TData) => {
      set(dataAtom, data)
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
    return get(dataAtom)
  })
  return observableDataAtom
}

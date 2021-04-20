import type { Store, Action, AnyAction } from 'redux'
import { atom } from 'jotai'
import type { NonFunction } from '../core/types'

export function atomWithStore<State, A extends Action = AnyAction>(
  store: Store<State, A>
) {
  const baseAtom = atom(store.getState() as NonFunction<State>)
  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(store.getState())
    }
    const unsub = store.subscribe(callback)
    callback()
    return unsub
  }
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (_get, _set, action: A) => {
      store.dispatch(action)
    }
  )
  return derivedAtom
}

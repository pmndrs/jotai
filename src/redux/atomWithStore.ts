import type { Store, Action, AnyAction } from 'redux'
import { atom } from 'jotai'

export function atomWithStore<State, A extends Action = AnyAction>(
  store: Store<State, A>
) {
  const baseAtom = atom(store.getState())
  baseAtom.onMount = (setValue) =>
    store.subscribe(() => {
      setValue(store.getState())
    })
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (_get, _set, action: A) => {
      store.dispatch(action)
    }
  )
  return derivedAtom
}

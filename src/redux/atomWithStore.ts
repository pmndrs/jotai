import type { Store, Action, AnyAction } from 'redux'
import { atom } from 'jotai'

export function atomWithStore<State, A extends Action = AnyAction>(
  store: Store<State, A>
) {
  const baseAtom = atom(store.getState())
  baseAtom.onMount = (setValue) => {
    const callback = () => {
      setValue(store.getState())
    }
    const unsub = store.subscribe(callback)
    callback()
    return unsub
  }
  const derivedAtom = atom(
    (get) => {
      baseAtom.scope = derivedAtom.scope
      return get(baseAtom)
    },
    (_get, _set, action: A) => {
      store.dispatch(action)
    }
  )
  return derivedAtom
}

import type { State, StoreApi } from 'zustand/vanilla'
import { atom } from 'jotai'
import type { SetStateAction } from 'jotai'

export function atomWithStore<T extends State>(store: StoreApi<T>) {
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
    (get, _set, update: SetStateAction<T>) => {
      baseAtom.scope = derivedAtom.scope
      const newState =
        typeof update === 'function'
          ? (update as (prev: T) => T)(get(baseAtom))
          : update
      store.setState(newState, true /* replace */)
    }
  )
  return derivedAtom
}

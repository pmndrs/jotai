import type { State, StoreApi } from 'zustand/vanilla'
import { atom } from 'jotai'
import type { SetStateAction, NonFunction } from '../core/types'

export function atomWithStore<T extends State>(store: StoreApi<T>) {
  const baseAtom = atom(store.getState() as NonFunction<T>)
  baseAtom.onMount = (setValue) =>
    store.subscribe(() => {
      setValue(store.getState())
    })
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (get, _set, update: SetStateAction<T>) => {
      const newState =
        typeof update === 'function'
          ? (update as (prev: T) => T)(get(baseAtom))
          : update
      store.setState(newState, true /* replace */)
    }
  )
  return derivedAtom
}

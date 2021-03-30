import { atom, WritableAtom } from 'jotai'
import type { SetStateAction } from '../core/types'

export function atomWithStorage<Value>(key: string, initialValue: Value) {
  type Update = SetStateAction<Value>

  const getInitialValue = () => {
    try {
      const storedValue = window.localStorage.getItem(key)
      return storedValue !== null ? JSON.parse(storedValue) : initialValue
    } catch {
      return initialValue
    }
  }

  const baseAtom = atom(initialValue)

  baseAtom.onMount = (setAtom) => {
    setAtom(getInitialValue())
  }

  const anAtom = atom<Value, Update>(
    (get) => get(baseAtom),
    (get, set, newValue: any) => {
      set(baseAtom, newValue)
      window.localStorage.setItem(key, JSON.stringify(newValue))
    }
  )

  return anAtom as WritableAtom<Value, Update>
}

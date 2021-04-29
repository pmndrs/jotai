import { atom, PrimitiveAtom } from 'jotai'
import type { SetStateAction } from '../core/types'

type Storage<Value> = {
  getItem: (key: string) => Value | Promise<Value>
  setItem: (key: string, newValue: Value) => void | Promise<void>
}

const defaultStorage: Storage<unknown> = {
  getItem: (key: string) => {
    const storedValue = localStorage.getItem(key)
    if (storedValue === null) {
      throw new Error('no value stored')
    }
    return JSON.parse(storedValue)
  },
  setItem: (key, newValue: unknown) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  },
}

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: Storage<Value> = defaultStorage as Storage<Value>
): PrimitiveAtom<Value> {
  const getInitialValue = () => {
    try {
      return storage.getItem(key)
    } catch {
      return initialValue
    }
  }

  const baseAtom = atom(initialValue)

  baseAtom.onMount = (setAtom) => {
    Promise.resolve(getInitialValue()).then(setAtom)
  }

  const anAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<Value>) => {
      const newValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(baseAtom))
          : update
      set(baseAtom, newValue)
      storage.setItem(key, newValue)
    }
  )

  return anAtom
}

import { atom } from 'jotai'
import type { PrimitiveAtom, SetStateAction } from 'jotai'

type Unsubscribe = () => void

type Storage<Value> = {
  getItem: (key: string) => Value | Promise<Value>
  setItem: (key: string, newValue: Value) => void | Promise<void>
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

type StringStorage = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, newValue: string) => void | Promise<void>
}

export const createJSONStorage = (
  getStringStorage: () => StringStorage
): Storage<unknown> => ({
  getItem: (key) => {
    const value = getStringStorage().getItem(key)
    if (value instanceof Promise) {
      return value.then((v) => JSON.parse(v || ''))
    }
    return JSON.parse(value || '')
  },
  setItem: (key, newValue) => {
    getStringStorage().setItem(key, JSON.stringify(newValue))
  },
})

const defaultStorage = createJSONStorage(() => localStorage)

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: Storage<Value> = defaultStorage as Storage<Value>
): PrimitiveAtom<Value> {
  const getInitialValue = () => {
    try {
      const value = storage.getItem(key)
      if (value instanceof Promise) {
        return value.catch(() => initialValue)
      }
      return value
    } catch {
      return initialValue
    }
  }

  const baseAtom = atom(storage.delayInit ? initialValue : getInitialValue())

  baseAtom.onMount = (setAtom) => {
    let unsub: Unsubscribe | undefined
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom)
    }
    if (storage.delayInit) {
      const value = getInitialValue()
      if (value instanceof Promise) {
        value.then(setAtom)
      } else {
        setAtom(value)
      }
    }
    return unsub
  }

  const anAtom = atom(
    (get) => {
      baseAtom.scope = anAtom.scope
      return get(baseAtom)
    },
    (get, set, update: SetStateAction<Value>) => {
      baseAtom.scope = anAtom.scope
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

export function atomWithHash<Value>(
  key: string,
  initialValue: Value,
  serialize: (val: Value) => string = JSON.stringify,
  deserialize: (str: string) => Value = JSON.parse
): PrimitiveAtom<Value> {
  const hashStorage: Storage<Value> = {
    getItem: (key) => {
      const searchParams = new URLSearchParams(location.hash.slice(1))
      const storedValue = searchParams.get(key)
      if (storedValue === null) {
        throw new Error('no value stored')
      }
      return deserialize(storedValue)
    },
    setItem: (key, newValue) => {
      const searchParams = new URLSearchParams(location.hash.slice(1))
      searchParams.set(key, serialize(newValue))
      location.hash = searchParams.toString()
    },
    delayInit: true,
    subscribe: (key, setValue) => {
      const callback = () => {
        const searchParams = new URLSearchParams(location.hash.slice(1))
        const str = searchParams.get(key)
        if (str !== null) {
          setValue(deserialize(str))
        }
      }
      window.addEventListener('hashchange', callback)
      return () => {
        window.removeEventListener('hashchange', callback)
      }
    },
  }

  return atomWithStorage(key, initialValue, hashStorage)
}

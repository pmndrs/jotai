import { atom } from 'jotai'
import type { PrimitiveAtom, SetStateAction, WritableAtom } from 'jotai'

type Unsubscribe = () => void

type AsyncStorage<Value> = {
  getItem: (key: string) => Promise<Value>
  setItem: (key: string, newValue: Value) => Promise<void>
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

type SyncStorage<Value> = {
  getItem: (key: string) => Value
  setItem: (key: string, newValue: Value) => void
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

type AsyncStringStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, newValue: string) => Promise<void>
}

type SyncStringStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, newValue: string) => void
}

export function createJSONStorage(
  getStringStorage: () => AsyncStringStorage
): AsyncStorage<unknown>

export function createJSONStorage(
  getStringStorage: () => SyncStringStorage
): SyncStorage<unknown>

export function createJSONStorage(
  getStringStorage: () => AsyncStringStorage | SyncStringStorage
): AsyncStorage<unknown> | SyncStorage<unknown> {
  return {
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
  }
}

const defaultStorage = createJSONStorage(() => localStorage)

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value> & { delayInit: true }
): WritableAtom<Value, SetStateAction<Value>, Promise<void>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value>
): WritableAtom<Promise<Value>, SetStateAction<Value>, Promise<void>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: SyncStorage<Value>
): PrimitiveAtom<Value>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage:
    | SyncStorage<Value>
    | AsyncStorage<Value> = defaultStorage as SyncStorage<Value>
) {
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
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<Value>) => {
      const newValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(baseAtom))
          : update
      set(baseAtom, newValue)
      return storage.setItem(key, newValue)
    }
  )

  return anAtom
}

// atomWithHash is implemented with atomWithStorage

export function atomWithHash<Value>(
  key: string,
  initialValue: Value,
  options?: {
    serialize?: (val: Value) => string
    deserialize?: (str: string) => Value
    delayInit?: boolean
    replaceState?: boolean
    subscribe?: (callback: () => void) => () => void
  }
): PrimitiveAtom<Value> {
  const serialize = options?.serialize || JSON.stringify
  const deserialize = options?.deserialize || JSON.parse
  const subscribe =
    options?.subscribe ||
    ((callback) => {
      window.addEventListener('hashchange', callback)
      return () => {
        window.removeEventListener('hashchange', callback)
      }
    })
  const hashStorage: SyncStorage<Value> = {
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
      if (options?.replaceState) {
        history.replaceState(null, '', '#' + searchParams.toString())
      } else {
        location.hash = searchParams.toString()
      }
    },
    delayInit: options?.delayInit,
    subscribe: (key, setValue) => {
      const callback = () => {
        const searchParams = new URLSearchParams(location.hash.slice(1))
        const str = searchParams.get(key)
        if (str !== null) {
          setValue(deserialize(str))
        } else {
          setValue(initialValue)
        }
      }
      return subscribe(callback)
    },
  }

  return atomWithStorage(key, initialValue, hashStorage)
}

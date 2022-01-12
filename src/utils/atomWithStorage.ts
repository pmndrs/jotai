import { atom } from 'jotai'
import type { SetStateAction, WritableAtom } from 'jotai'
import { RESET } from './constants'

type Unsubscribe = () => void

type AsyncStorage<Value> = {
  getItem: (key: string) => Promise<Value>
  setItem: (key: string, newValue: Value) => Promise<void>
  /**
   * This will be required in the next version
   */
  removeItem?: (key: string) => Promise<void>
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

type SyncStorage<Value> = {
  getItem: (key: string) => Value
  setItem: (key: string, newValue: Value) => void
  /**
   * This will be required in the next version
   */
  removeItem?: (key: string) => void
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

type AsyncStringStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, newValue: string) => Promise<void>
  /**
   * This will be required in the next version
   */
  removeItem?: (key: string) => Promise<void>
}

type SyncStringStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, newValue: string) => void
  /**
   * This will be required in the next version
   */
  removeItem?: (key: string) => void
}

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage
): AsyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => SyncStringStorage
): SyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage | SyncStringStorage
): AsyncStorage<Value> | SyncStorage<Value> {
  try {
    if (!getStringStorage().removeItem) {
      console.warn(
        'Missing removeItem. In the next version, it will be required.'
      )
    }
  } catch {
    // getStringStorage can throw if localStorage is not defined
  }
  return {
    getItem: (key) => {
      const value = getStringStorage().getItem(key)
      if (value instanceof Promise) {
        return value.then((v) => JSON.parse(v || ''))
      }
      return JSON.parse(value || '')
    },
    setItem: (key, newValue) =>
      getStringStorage().setItem(key, JSON.stringify(newValue)),
    removeItem: (key) => getStringStorage().removeItem?.(key), // TODO remove optional chaining
  }
}

const defaultStorage = createJSONStorage(() => localStorage)

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value> & { delayInit: true }
): WritableAtom<Value, SetStateAction<Value> | typeof RESET, Promise<void>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value>
): WritableAtom<
  Promise<Value>,
  SetStateAction<Value> | typeof RESET,
  Promise<void>
>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: SyncStorage<Value>
): WritableAtom<Value, SetStateAction<Value> | typeof RESET>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value
): WritableAtom<Value, SetStateAction<Value> | typeof RESET>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage:
    | SyncStorage<Value>
    | AsyncStorage<Value> = defaultStorage as SyncStorage<Value>
) {
  if (!storage.removeItem) {
    console.warn(
      'Missing removeItem. In the next version, it will be required.'
    )
  }

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
    (get, set, update: SetStateAction<Value> | typeof RESET) => {
      if (update === RESET) {
        set(baseAtom, initialValue)
        return storage.removeItem?.(key) // TODO remove optional chaining
      }
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
): WritableAtom<Value, SetStateAction<Value> | typeof RESET> {
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
    removeItem: (key) => {
      const searchParams = new URLSearchParams(location.hash.slice(1))
      searchParams.delete(key)
      if (options?.replaceState) {
        history.replaceState(null, '', '#' + searchParams.toString())
      } else {
        location.hash = searchParams.toString()
      }
    },
    ...(options?.delayInit && { delayInit: true }),
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

import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'
import { RESET } from './constants'

export const NO_STORAGE_VALUE = Symbol()

type Unsubscribe = () => void

type SetStateActionWithReset<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET)

export interface AsyncStorage<Value> {
  getItem: (key: string) => Promise<Value | typeof NO_STORAGE_VALUE>
  setItem: (key: string, newValue: Value) => Promise<void>
  removeItem: (key: string) => Promise<void>
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

export interface SyncStorage<Value> {
  getItem: (key: string) => Value | typeof NO_STORAGE_VALUE
  setItem: (key: string, newValue: Value) => void
  removeItem: (key: string) => void
  delayInit?: boolean
  subscribe?: (key: string, callback: (value: Value) => void) => Unsubscribe
}

export interface AsyncStringStorage {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, newValue: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

export interface SyncStringStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, newValue: string) => void
  removeItem: (key: string) => void
}

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage
): AsyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => SyncStringStorage
): SyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage | SyncStringStorage | undefined
): AsyncStorage<Value> | SyncStorage<Value> {
  let lastStr: string | undefined
  let lastValue: any
  const storage: AsyncStorage<Value> | SyncStorage<Value> = {
    getItem: (key) => {
      const parse = (str: string | null) => {
        str = str || ''
        if (lastStr !== str) {
          try {
            lastValue = JSON.parse(str)
          } catch {
            return NO_STORAGE_VALUE
          }
          lastStr = str
        }
        return lastValue
      }
      const str = getStringStorage()?.getItem(key) ?? null
      if (str instanceof Promise) {
        return str.then(parse)
      }
      return parse(str)
    },
    setItem: (key, newValue) =>
      getStringStorage()?.setItem(key, JSON.stringify(newValue)),
    removeItem: (key) => getStringStorage()?.removeItem(key),
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    storage.subscribe = (key, callback) => {
      const storageEventCallback = (e: StorageEvent) => {
        if (e.key === key && e.newValue) {
          callback(JSON.parse(e.newValue))
        }
      }
      window.addEventListener('storage', storageEventCallback)
      return () => {
        window.removeEventListener('storage', storageEventCallback)
      }
    }
  }
  return storage
}

const defaultStorage = createJSONStorage(() =>
  typeof window !== 'undefined'
    ? window.localStorage
    : (undefined as unknown as Storage)
)

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value> & { delayInit: true }
): WritableAtom<Value, SetStateActionWithReset<Value>, Promise<void>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value>
): WritableAtom<Promise<Value>, SetStateActionWithReset<Value>, Promise<void>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: SyncStorage<Value>
): WritableAtom<Value, SetStateActionWithReset<Value>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value
): WritableAtom<Value, SetStateActionWithReset<Value>>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage:
    | SyncStorage<Value>
    | AsyncStorage<Value> = defaultStorage as SyncStorage<Value>
) {
  const getInitialValue = () => {
    const value = storage.getItem(key)
    if (value instanceof Promise) {
      return value.then((v) => (v === NO_STORAGE_VALUE ? initialValue : v))
    }
    return value === NO_STORAGE_VALUE ? initialValue : value
  }

  const baseAtom = atom(storage.delayInit ? initialValue : getInitialValue())

  baseAtom.onMount = (setAtom) => {
    let unsub: Unsubscribe | undefined
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom)
      // in case it's updated before subscribing
      setAtom(getInitialValue())
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
    (get, set, update: SetStateActionWithReset<Value>) => {
      const nextValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value | typeof RESET)(get(baseAtom))
          : update

      if (nextValue === RESET) {
        set(baseAtom, initialValue)
        return storage.removeItem(key)
      }

      set(baseAtom, nextValue)
      return storage.setItem(key, nextValue)
    }
  )

  return anAtom
}

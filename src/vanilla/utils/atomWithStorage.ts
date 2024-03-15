import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'
import { RESET } from './constants.ts'

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

type Unsubscribe = () => void

type SetStateActionWithReset<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET)

export interface AsyncStorage<Value> {
  getItem: (key: string, initialValue: Value) => PromiseLike<Value>
  setItem: (key: string, newValue: Value) => PromiseLike<void>
  removeItem: (key: string) => PromiseLike<void>
  subscribe?: (
    key: string,
    callback: (value: Value) => void,
    initialValue: Value,
  ) => Unsubscribe
}

export interface SyncStorage<Value> {
  getItem: (key: string, initialValue: Value) => Value
  setItem: (key: string, newValue: Value) => void
  removeItem: (key: string) => void
  subscribe?: (
    key: string,
    callback: (value: Value) => void,
    initialValue: Value,
  ) => Unsubscribe
}

export interface AsyncStringStorage {
  getItem: (key: string) => PromiseLike<string | null>
  setItem: (key: string, newValue: string) => PromiseLike<void>
  removeItem: (key: string) => PromiseLike<void>
}

export interface SyncStringStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, newValue: string) => void
  removeItem: (key: string) => void
}

export function withStorageValidator<Value>(
  validator: (value: unknown) => value is Value,
): {
  (storage: AsyncStorage<unknown>): AsyncStorage<Value>
  (storage: SyncStorage<unknown>): SyncStorage<Value>
}

export function withStorageValidator<Value>(
  validator: (value: unknown) => value is Value,
) {
  return (unknownStorage: AsyncStorage<unknown> | SyncStorage<unknown>) => {
    const storage = {
      ...unknownStorage,
      getItem: (key: string, initialValue: Value) => {
        const validate = (value: unknown) => {
          if (!validator(value)) {
            return initialValue
          }
          return value
        }
        const value = unknownStorage.getItem(key, initialValue)
        if (isPromiseLike(value)) {
          return value.then(validate)
        }
        return validate(value)
      },
    }
    return storage as any // FIXME better way to type this?
  }
}

type JsonStorageOptions = {
  reviver?: (key: string, value: unknown) => unknown
  replacer?: (key: string, value: unknown) => unknown
}

export function createJSONStorage<Value>(): SyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => AsyncStringStorage,
  options?: JsonStorageOptions,
): AsyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () => SyncStringStorage,
  options?: JsonStorageOptions,
): SyncStorage<Value>

export function createJSONStorage<Value>(
  getStringStorage: () =>
    | AsyncStringStorage
    | SyncStringStorage
    | undefined = () => {
    try {
      return window.localStorage
    } catch (e) {
      if (import.meta.env?.MODE !== 'production') {
        if (typeof window !== 'undefined') {
          console.warn(e)
        }
      }
      return undefined
    }
  },
  options?: JsonStorageOptions,
): AsyncStorage<Value> | SyncStorage<Value> {
  let lastStr: string | undefined
  let lastValue: any
  const storage: AsyncStorage<Value> | SyncStorage<Value> = {
    getItem: (key, initialValue) => {
      const parse = (str: string | null) => {
        str = str || ''
        if (lastStr !== str) {
          try {
            lastValue = JSON.parse(str, options?.reviver)
          } catch {
            return initialValue
          }
          lastStr = str
        }
        return lastValue
      }
      const str = getStringStorage()?.getItem(key) ?? null
      if (isPromiseLike(str)) {
        return str.then(parse)
      }
      return parse(str)
    },
    setItem: (key, newValue) =>
      getStringStorage()?.setItem(
        key,
        JSON.stringify(newValue, options?.replacer),
      ),
    removeItem: (key) => getStringStorage()?.removeItem(key),
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function' &&
    window.Storage
  ) {
    storage.subscribe = (key, callback, initialValue) => {
      if (!(getStringStorage() instanceof window.Storage)) {
        return () => {}
      }
      const storageEventCallback = (e: StorageEvent) => {
        if (e.storageArea === getStringStorage() && e.key === key) {
          let newValue: Value
          try {
            newValue = JSON.parse(e.newValue || '')
          } catch {
            newValue = initialValue
          }
          callback(newValue)
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

const defaultStorage = createJSONStorage()

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage: AsyncStorage<Value>,
  options?: { getOnInit?: boolean },
): WritableAtom<
  Value | Promise<Value>,
  [SetStateActionWithReset<Value | Promise<Value>>],
  Promise<void>
>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage?: SyncStorage<Value>,
  options?: { getOnInit?: boolean },
): WritableAtom<Value, [SetStateActionWithReset<Value>], void>

export function atomWithStorage<Value>(
  key: string,
  initialValue: Value,
  storage:
    | SyncStorage<Value>
    | AsyncStorage<Value> = defaultStorage as SyncStorage<Value>,
  options?: { getOnInit?: boolean },
): any {
  const getOnInit = options?.getOnInit
  const baseAtom = atom(
    getOnInit
      ? (storage.getItem(key, initialValue) as Value | Promise<Value>)
      : initialValue,
  )

  if (import.meta.env?.MODE !== 'production') {
    baseAtom.debugPrivate = true
  }

  baseAtom.onMount = (setAtom) => {
    setAtom(storage.getItem(key, initialValue) as Value | Promise<Value>)
    let unsub: Unsubscribe | undefined
    if (storage.subscribe) {
      unsub = storage.subscribe(key, setAtom, initialValue)
    }
    return unsub
  }

  const anAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateActionWithReset<Value | Promise<Value>>) => {
      const nextValue =
        typeof update === 'function'
          ? (
              update as (
                prev: Value | Promise<Value>,
              ) => Value | Promise<Value> | typeof RESET
            )(get(baseAtom))
          : update
      if (nextValue === RESET) {
        set(baseAtom, initialValue)
        return storage.removeItem(key)
      }
      if (nextValue instanceof Promise) {
        return nextValue.then((resolvedValue) => {
          set(baseAtom, resolvedValue)
          return storage.setItem(key, resolvedValue)
        })
      }
      set(baseAtom, nextValue)
      return storage.setItem(key, nextValue)
    },
  )

  return anAtom
}

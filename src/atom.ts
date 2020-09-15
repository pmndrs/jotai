import {
  Getter,
  Setter,
  Atom,
  WritableAtom,
  PrimitiveAtom,
  NonPromise,
  NonFunction,
} from './types'

let keyCount = 0 // global key count for all atoms

// writable derived atom
export function atom<Value, Update>(
  read: (get: Getter) => NonPromise<Value>,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): WritableAtom<Value, Update>

// write-only derived atom
export function atom<Value, Update>(
  read: NonFunction<NonPromise<Value>>,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): WritableAtom<Value, Update>

// async-read writable derived atom
export function atom<Value, Update>(
  read: (get: Getter) => Promise<Value>,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): WritableAtom<Value | Promise<Value>, Update>

// read-only derived atom
export function atom<Value>(
  read: (get: Getter) => NonPromise<Value>
): Atom<Value>

// async-read read-only derived atom
export function atom<Value>(
  read: (get: Getter) => Promise<Value>
): Atom<Value | Promise<Value>>

// primitive atom
export function atom<Value>(
  initialValue: NonFunction<NonPromise<Value>>
): PrimitiveAtom<Value>

export function atom<Value, Update>(
  read: Value | ((get: Getter) => Value | Promise<Value>),
  write?: (get: Getter, set: Setter, update: Update) => void | Promise<void>
) {
  const config = {
    key: ++keyCount,
  } as WritableAtom<Value | Promise<Value>, Update>
  if (typeof read === 'function') {
    config.read = read as (get: Getter) => Value | Promise<Value>
  } else {
    config.init = read
    config.read = (get: Getter) => get(config)
    config.write = (get: Getter, set: Setter, update: Update) => {
      set(config, typeof update === 'function' ? update(get(config)) : update)
    }
  }
  if (write) {
    config.write = write
  }
  return config
}

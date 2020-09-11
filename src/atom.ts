import {
  Getter,
  Setter,
  Atom,
  WritableAtom,
  NonPromise,
  NonFunction,
  SetStateAction,
} from './types'

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
): WritableAtom<Value, SetStateAction<Value>>

export function atom<Value, Update>(
  read: Value | ((get: Getter) => Value | Promise<Value>),
  write?: (get: Getter, set: Setter, update: Update) => void | Promise<void>
) {
  const instance = {} as WritableAtom<Value | Promise<Value>, Update>
  if (typeof read === 'function') {
    instance.read = read as (get: Getter) => Value | Promise<Value>
  } else {
    instance.init = read
    instance.read = (get: Getter) => get(instance)
    instance.write = (get: Getter, set: Setter, update: Update) => {
      set(
        instance,
        typeof update === 'function' ? update(get(instance)) : update
      )
    }
  }
  if (write) {
    instance.write = write
  }
  return instance
}

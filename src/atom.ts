import {
  Getter,
  Setter,
  Atom,
  WritableAtom,
  NonPromise,
  NonFunction,
} from './types'

// writable derived atom
export function atom<Value, WriteValue>(
  read: (get: Getter) => NonPromise<Value>,
  write: (
    get: Getter,
    set: Setter,
    writeValue: WriteValue
  ) => void | Promise<void>
): WritableAtom<Value, WriteValue>

// async-read writable derived atom
export function atom<Value, WriteValue>(
  read: (get: Getter) => Promise<Value>,
  write: (
    get: Getter,
    set: Setter,
    writeValue: WriteValue
  ) => void | Promise<void>
): WritableAtom<Value | null, WriteValue>

// read-only derived atom
export function atom<Value>(
  read: (get: Getter) => NonPromise<Value>
): Atom<Value>

// async-read read-only derived atom
export function atom<Value>(
  read: (get: Getter) => Promise<Value>
): Atom<Value | null>

// primitive atom
export function atom<Value>(
  initialValue: NonFunction<NonPromise<Value>>
): WritableAtom<Value, Value>

export function atom<Value, WriteValue>(
  read: Value | ((get: Getter) => Value | Promise<Value>),
  write?: (
    get: Getter,
    set: Setter,
    writeValue: WriteValue
  ) => void | Promise<void>
) {
  const instance = ({
    initialValue: null,
  } as unknown) as WritableAtom<Value, WriteValue>
  if (typeof read === 'function') {
    // read function
    instance.read = read as (get: Getter) => Value | Promise<Value>
    const value = (read as (get: Getter) => Value | Promise<Value>)(
      a => a.initialValue
    )
    if (value instanceof Promise) {
      value.then(v => {
        instance.initialValue = v
      })
    } else {
      instance.initialValue = value
    }
  } else {
    // primitive atom
    instance.initialValue = read
    instance.read = (get: Getter) =>
      get(instance as WritableAtom<Value, WriteValue>)
    instance.write = (_get: Getter, set: Setter, writeValue: WriteValue) => {
      set(instance as WritableAtom<Value, WriteValue>, writeValue)
    }
  }
  if (write) {
    instance.write = write
  }
  return instance
}

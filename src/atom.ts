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
    newValue: WriteValue
  ) => void | Promise<void>
): WritableAtom<Value, WriteValue>

// async-read writable derived atom
export function atom<Value, WriteValue>(
  read: (get: Getter) => Promise<Value>,
  write: (
    get: Getter,
    set: Setter,
    newValue: WriteValue
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
    newValue: WriteValue
  ) => void | Promise<void>
) {
  const instance: any = {
    initialValue: null,
  }
  if (typeof read === 'function') {
    // read function
    instance.read = (arg: { get: Getter }) =>
      (read as (get: Getter) => Value | Promise<Value>)(arg.get)
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
    instance.read = (arg: { get: Getter }) =>
      arg.get(instance as WritableAtom<Value, WriteValue>)
    instance.write = (
      arg: { get: Getter; set: Setter },
      newValue: WriteValue
    ) => {
      arg.set(instance as WritableAtom<Value, WriteValue>, newValue)
    }
  }
  if (write) {
    instance.write = (
      arg: { get: Getter; set: Setter },
      newValue: WriteValue
    ) => write(arg.get, arg.set, newValue)
  }
  return instance
}

import { Atom, WritableAtom, NonPromise, NonFunction } from './types'

// primitive atom
export function atom<Value>(
  initialValue: NonFunction<Value>
): WritableAtom<Value, Value>

// writable derived atom
export function atom<WriteValue, Value>(
  read: (get: <V>(a: Atom<V>) => V) => NonPromise<Value>,
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: WriteValue
  ) => void | Promise<void>
): WritableAtom<WriteValue, Value>

// async-read writable derived atom
export function atom<WriteValue, Value>(
  read: (get: <V>(a: Atom<V>) => V) => Promise<Value>,
  write: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: WriteValue
  ) => void | Promise<void>
): WritableAtom<WriteValue, Value | null>

// read-only derived atom
export function atom<Value>(
  read: (get: <V>(a: Atom<V>) => V) => NonPromise<Value>
): Atom<Value>

// async-read read-only derived atom
export function atom<Value>(
  read: (get: <V>(a: Atom<V>) => V) => Promise<Value>
): Atom<Value | null>

export function atom<Value>(
  read:
    | Value
    | ((arg: { get: <V>(a: Atom<V>) => V }) => Value | Promise<Value>),
  write?: (
    get: <V>(a: Atom<V>) => V,
    set: <V>(a: WritableAtom<V>, v: V) => void,
    newValue: Value
  ) => void | Promise<void>
) {
  const instance: any = {
    initialValue: null,
  }
  if (typeof read === 'function') {
    // read function
    instance.read = (arg: Parameters<Atom<Value>['read']>[0]) =>
      (read as Function)(arg.get)
    const value = (read as Function)((a: Atom<Value>) => a.initialValue)
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
    instance.read = (arg: Parameters<Atom<Value>['read']>[0]) =>
      arg.get(instance as WritableAtom<Value, Value>)
    instance.write = (
      arg: Parameters<WritableAtom<Value>['write']>[0],
      newValue: Parameters<WritableAtom<Value>['write']>[1]
    ) => {
      arg.set(instance as WritableAtom<Value>, newValue)
    }
  }
  if (write) {
    instance.write = (
      arg: Parameters<WritableAtom<Value>['write']>[0],
      newValue: Parameters<WritableAtom<Value>['write']>[1]
    ) => write(arg.get, arg.set, newValue)
  }
  return instance
}

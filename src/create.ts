import { Atom, WritableAtom } from './types'

type NonPromise<T> = T extends Promise<unknown> ? never : T

// primitive atom
export function create<Value>(options: {
  default: Value
}): WritableAtom<Value, Value>

// write-only atom
export function create<Value>(options: {
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: Value
  ) => void | Promise<void>
}): WritableAtom<Value, never>

// writable derived atom
export function create<WriteValue, Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => NonPromise<Value>
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: WriteValue
  ) => void | Promise<void>
}): WritableAtom<WriteValue, Value>

// async writable derived atom
export function create<WriteValue, Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => Promise<Value>
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: WriteValue
  ) => void | Promise<void>
}): WritableAtom<WriteValue, Value | null>

// read-only derived atom
export function create<Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => NonPromise<Value>
}): Atom<Value>

// async read-only derived atom
export function create<Value>(options: {
  write: (arg: { get: <V>(a: Atom<V>) => V }) => Promise<Value>
}): Atom<Value | null>

export function create<Value>(options: {
  default?: Value
  read?: (arg: { get: <V>(a: Atom<V>) => V }) => Value | Promise<Value>
  write?: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: Value
  ) => void | Promise<void>
}) {
  const atom = {
    ...options,
    default: (options.default ?? null) as Value | null,
  }
  if (atom.read) {
    // derived atom
    const value = atom.read({
      get: a => a.default,
    })
    if (value instanceof Promise) {
      value.then(v => {
        atom.default = v
      })
    } else {
      atom.default = value
    }
  } else if (atom.write) {
    // write-only atom
    atom.read = () => undefined as any
  } else {
    // primitive atom
    atom.read = arg => arg.get(atom as WritableAtom<Value, Value>)
    atom.write = (arg, newValue) =>
      arg.set(atom as WritableAtom<Value>, newValue)
  }
  return atom
}

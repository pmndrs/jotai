import { Atom, WritableAtom } from './types'

type NonPromise<T> = T extends Promise<unknown> ? never : T

export function create<Value>(options: { default: Value }): WritableAtom<Value>

export function create<Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => NonPromise<Value>
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: Value
  ) => void | Promise<void>
}): WritableAtom<Value>

export function create<Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => Promise<Value>
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: Value
  ) => void | Promise<void>
}): WritableAtom<Value | null>

export function create<Value>(options: {
  read: (arg: { get: <V>(a: Atom<V>) => V }) => NonPromise<Value>
}): Atom<Value>

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
  } else {
    atom.read = arg => arg.get(atom as WritableAtom<Value>)
    atom.write = (arg, newValue) =>
      arg.set(atom as WritableAtom<Value>, newValue)
  }
  return atom
}

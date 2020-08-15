export type NonPromise<T> = T extends Promise<unknown> ? never : T
export type NonFunction<T> = T extends Function ? never : T

// FIXME we should prohibit Value to be function
export type Atom<Value> = {
  initialValue: Value
  read: (arg: { get: <V>(a: Atom<V>) => V }) => Value | Promise<Value>
}

export type WritableAtom<WriteValue, Value = never> = Atom<Value> & {
  write: (
    arg: {
      get: <V>(a: Atom<V>) => V
      set: <V>(a: WritableAtom<V>, v: V) => void
    },
    newValue: WriteValue
  ) => void | Promise<void>
}

export type Atom<Value> = {
  default: Value
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

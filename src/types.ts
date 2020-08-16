export type NonPromise<T> = T extends Promise<unknown> ? never : T
export type NonFunction<T> = T extends Function ? never : T

export type Getter = <Value>(atom: Atom<Value>) => Value

export type Setter = <Value, WriteValue>(
  atom: WritableAtom<Value, WriteValue>,
  writeValue: WriteValue
) => void

export type Atom<Value> = {
  initialValue: Value
  read: (get: Getter) => Value | Promise<Value>
}

export type WritableAtom<Value, WriteValue> = Atom<Value> & {
  write: (
    get: Getter,
    set: Setter,
    writeValue: WriteValue
  ) => void | Promise<void>
}

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

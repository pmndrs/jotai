export type NonPromise<T> = T extends Promise<unknown> ? never : T
export type NonFunction<T> = T extends Function ? never : T

export interface Getter {
  <Value>(a: Atom<Value>): Value
}

export interface Setter {
  <Value, WriteValue>(a: WritableAtom<Value, WriteValue>, v: WriteValue): void
}

export type Atom<Value> = {
  initialValue: NonFunction<NonPromise<Value>>
  read: (arg: { get: Getter }) => Value | Promise<Value>
}

export type WritableAtom<Value, WriteValue> = Atom<Value> & {
  write: (
    arg: { get: Getter; set: Setter },
    newValue: WriteValue
  ) => void | Promise<void>
}

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

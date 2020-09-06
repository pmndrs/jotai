export type NonPromise<T> = T extends Promise<unknown> ? never : T
export type NonFunction<T> = T extends Function ? never : T

export type SetStateAction<Value> =
  | NonFunction<Value>
  | ((prev: Value) => NonFunction<Value>)

export type Getter = <Value>(atom: Atom<Value>) => Value

export type Setter = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void

export type Atom<Value> = {
  initialValue: Value
  read: (get: Getter) => Value | Promise<Value>
}

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
}

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

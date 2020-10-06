export type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type Getter = <Value>(atom: Atom<Value>) => Value

export type Setter = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void

export type Atom<Value> = {
  key: string | number
  debugLabel?: string
  init?: Value
  read: (get: Getter) => Value | Promise<Value>
}

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
}

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

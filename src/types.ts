export type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type Getter = <Value>(atom: Atom<Value>) => Value

export type Setter = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void

export type Atom<Value> = {
  key: string | number
  init?: Value
  read: (get: Getter) => Value | Promise<Value>
}

type Write<Update> = [Update] extends [never]
  ? (get: Getter, set: Setter) => void | Promise<void>
  : undefined extends Update
  ? (get: Getter, set: Setter, update?: Update) => void | Promise<void>
  : (get: Getter, set: Setter, update: Update) => void | Promise<void>

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: Write<Update>
}

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

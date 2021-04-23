export type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type Getter = {
  <Value>(atom: Atom<Promise<Value>>): Value
  <Value>(atom: Atom<Value>): Value
}
export type Read<Value> = (get: Getter) => Value | Promise<Value>

export type Setter = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void
export type Write<Update> = (
  get: Getter,
  set: Setter,
  update: Update
) => void | Promise<void>

export type Scope = symbol | string | number

export type SetAtom<Update> = undefined extends Update
  ? (update?: Update) => void | Promise<void>
  : (update: Update) => void | Promise<void>

export type OnUnmount = () => void
export type OnMount<Update> = <S extends SetAtom<Update>>(
  setAtom: S
) => OnUnmount | void

export type Atom<Value> = {
  toString: () => string
  debugLabel?: string
  scope?: Scope
  read: Read<Value>
}

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: Write<Update>
  onMount?: OnMount<Update>
}

// This is an internal type and subjects to change.
export type WithInitialValue<Value> = {
  init: Value
}

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

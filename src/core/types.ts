export type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type NonFunction<Value> = Value extends (...args: any[]) => any
  ? never
  : Value

export type Getter = <Value>(atom: Atom<Value>) => Value
export type Read<Value> = (get: Getter) => Value | Promise<Value>

export type Setter = <Value, Update>(
  atom: WritableAtom<Value, Update>,
  update: Update
) => void
export type SyncWrite<Update> = (
  get: Getter,
  set: Setter,
  update: Update
) => void
export type AsyncWrite<Update> = (
  get: Getter,
  set: Setter,
  update: Update
) => Promise<void>
export type Write<Update> = SyncWrite<Update> | AsyncWrite<Update>

export type Scope = symbol | string | number

export type SyncSetAtom<Update> = undefined extends Update
  ? (update?: Update) => void
  : (update: Update) => void
export type AsyncSetAtom<Update> = undefined extends Update
  ? (update?: Update) => Promise<void>
  : (update: Update) => Promise<void>
export type SetAtom<Update> = SyncSetAtom<Update> | AsyncSetAtom<Update>

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

export type SyncWritableAtom<Value, Update> = Atom<Value> & {
  write: SyncWrite<Update>
  onMount?: OnMount<Update>
}
export type AsyncWritableAtom<Value, Update> = Atom<Value> & {
  write: AsyncWrite<Update>
  onMount?: OnMount<Update>
}
export type WritableAtom<Value, Update> =
  | SyncWritableAtom<Value, Update>
  | AsyncWritableAtom<Value, Update>

// This is an internal type and subjects to change.
export type WithInitialValue<Value> = {
  init: Value
}

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>

export type AnyAtom = Atom<unknown>
export type AnyWritableAtom = WritableAtom<unknown, unknown>

export type Getter = {
  <Value>(atom: Atom<Value | Promise<Value>>): Value
  <Value>(atom: Atom<Promise<Value>>): Value
  <Value>(atom: Atom<Value>): Value
}

export type WriteGetter = Getter & {
  <Value>(atom: Atom<Value | Promise<Value>>, unstable_promise: true):
    | Value
    | Promise<Value>
  <Value>(atom: Atom<Promise<Value>>, unstable_promise: true):
    | Value
    | Promise<Value>
  <Value>(atom: Atom<Value>, unstable_promise: true): Value | Promise<Value>
}

export type Setter = {
  <Value>(atom: WritableAtom<Value, undefined>): void
  <Value, Update>(atom: WritableAtom<Value, Update>, update: Update): void
}

export type Read<Value> = (get: Getter) => Value | Promise<Value>

export type Write<Update> = (
  get: WriteGetter,
  set: Setter,
  update: Update
) => void | Promise<void>

type WithInitialValue<Value> = {
  init: Value
}

export type Scope = symbol | string | number

// Are there better typings?
export type SetAtom<Update> = undefined extends Update
  ? (update?: Update) => void
  : (update: Update) => void

type OnUnmount = () => void
type OnMount<Update> = <S extends SetAtom<Update>>(
  setAtom: S
) => OnUnmount | void

export type Atom<Value> = {
  toString: () => string
  debugLabel?: string
  /**
   * @deprecated Instead use `useAtom(atom, scope)`
   */
  scope?: Scope
  read: Read<Value>
}

export type WritableAtom<Value, Update> = Atom<Value> & {
  write: Write<Update>
  onMount?: OnMount<Update>
}

type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type PrimitiveAtom<Value> = WritableAtom<Value, SetStateAction<Value>>

let keyCount = 0 // global key count for all atoms

// writable derived atom
export function atom<Value, Update>(
  read: Read<Value>,
  write: Write<Update>
): WritableAtom<Value, Update>

// write-only derived atom
export function atom<Value, Update>(
  initialValue: Value,
  write: Write<Update>
): [Value] extends [Function]
  ? never
  : WritableAtom<Value, Update> & WithInitialValue<Value>

// read-only derived atom
export function atom<Value>(read: Read<Value>): Atom<Value>

// primitive atom
export function atom<Value extends unknown>(
  initialValue: Value
): [Value] extends [Function]
  ? never
  : PrimitiveAtom<Value> & WithInitialValue<Value>

export function atom<Value, Update>(
  read: Value | Read<Value>,
  write?: Write<Update>
) {
  const key = `atom${++keyCount}`
  const config = {
    toString: () => key,
  } as WritableAtom<Value, Update> & { init?: Value }
  if (typeof read === 'function') {
    config.read = read as Read<Value>
  } else {
    config.init = read
    config.read = (get) => get(config)
    config.write = (get, set, update) => {
      set(config, typeof update === 'function' ? update(get(config)) : update)
    }
  }
  if (write) {
    config.write = write
  }
  return config
}

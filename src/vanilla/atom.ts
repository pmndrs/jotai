import type { INTERNAL_PrdStore as Store } from './store'

type Getter = <Value>(atom: Atom<Value>) => Value

type Setter = <Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result

type SetAtom<Args extends unknown[], Result> = <A extends Args>(
  ...args: A
) => Result

/**
 * setSelf is for internal use only and subject to change without notice.
 */
type Read<Value, SetSelf = never> = (
  get: Getter,
  options: { readonly signal: AbortSignal; readonly setSelf: SetSelf },
) => Value

type Write<Args extends unknown[], Result> = (
  get: Getter,
  set: Setter,
  ...args: Args
) => Result

// This is an internal type and not part of public API.
// Do not depend on it as it can change without notice.
type WithInitialValue<Value> = {
  init: Value
}

type OnUnmount = () => void

type OnMount<Args extends unknown[], Result> = <
  S extends SetAtom<Args, Result>,
>(
  setAtom: S,
) => OnUnmount | void

export interface Atom<Value> {
  toString: () => string
  read: Read<Value>
  unstable_is?(a: Atom<unknown>): boolean
  debugLabel?: string
  /**
   * To ONLY be used by Jotai libraries to mark atoms as private. Subject to change.
   * @private
   */
  debugPrivate?: boolean
  /**
   * Fires after atom is referenced by the store for the first time
   * This is still an experimental API and subject to change without notice.
   */
  unstable_onInit?: (store: Store) => void
}

export interface WritableAtom<Value, Args extends unknown[], Result>
  extends Atom<Value> {
  read: Read<Value, SetAtom<Args, Result>>
  write: Write<Args, Result>
  onMount?: OnMount<Args, Result>
}

type SetStateAction<Value> = Value | ((prev: Value) => Value)

export type PrimitiveAtom<Value> = WritableAtom<
  Value,
  [SetStateAction<Value>],
  void
>

let keyCount = 0 // global key count for all atoms

// writable derived atom
export function atom<Value, Args extends unknown[], Result>(
  read: Read<Value, SetAtom<Args, Result>>,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result>

// read-only derived atom
export function atom<Value>(read: Read<Value>): Atom<Value>

// write-only derived atom
export function atom<Value, Args extends unknown[], Result>(
  initialValue: Value,
  write: Write<Args, Result>,
): WritableAtom<Value, Args, Result> & WithInitialValue<Value>

// primitive atom without initial value
export function atom<Value>(): PrimitiveAtom<Value | undefined> &
  WithInitialValue<Value | undefined>

// primitive atom
export function atom<Value>(
  initialValue: Value,
): PrimitiveAtom<Value> & WithInitialValue<Value>

export function atom<Value, Args extends unknown[], Result>(
  read?: Value | Read<Value, SetAtom<Args, Result>>,
  write?: Write<Args, Result>,
) {
  const key = `atom${++keyCount}`
  const config = {
    toString() {
      return import.meta.env?.MODE !== 'production' && this.debugLabel
        ? key + ':' + this.debugLabel
        : key
    },
  } as WritableAtom<Value, Args, Result> & { init?: Value | undefined }
  if (typeof read === 'function') {
    config.read = read as Read<Value, SetAtom<Args, Result>>
  } else {
    config.init = read
    config.read = defaultRead
    config.write = defaultWrite as unknown as Write<Args, Result>
  }
  if (write) {
    config.write = write
  }
  return config
}

function defaultRead<Value>(this: Atom<Value>, get: Getter) {
  return get(this)
}

function defaultWrite<Value>(
  this: PrimitiveAtom<Value>,
  get: Getter,
  set: Setter,
  arg: SetStateAction<Value>,
) {
  return set(
    this,
    typeof arg === 'function'
      ? (arg as (prev: Value) => Value)(get(this))
      : arg,
  )
}

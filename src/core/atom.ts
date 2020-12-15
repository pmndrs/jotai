import {
  Getter,
  Setter,
  Atom,
  WritableAtom,
  WithInitialValue,
  PrimitiveAtom,
} from './types'

let keyCount = 0 // global key count for all atoms

// writable derived atom
export function atom<Value, Update>(
  read: (get: Getter) => Value | Promise<Value>,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): WritableAtom<Value, Update>

// invalid writable derived atom
export function atom<Value, Update>(
  read: Function,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): never

// write-only derived atom
export function atom<Value, Update>(
  read: Value,
  write: (get: Getter, set: Setter, update: Update) => void | Promise<void>
): WritableAtom<Value, Update> & WithInitialValue<Value>

// read-only derived atom
export function atom<Value, Update extends never = never>(
  read: (get: Getter) => Value | Promise<Value>
): Atom<Value>

// invalid read-only derived atom
export function atom<Value, Update>(read: Function): never

// primitive atom
export function atom<Value, Update extends never = never>(
  initialValue: Value
): PrimitiveAtom<Value> & WithInitialValue<Value>

export function atom<Value, Update>(
  read: Value | ((get: Getter) => Value | Promise<Value>),
  write?: (get: Getter, set: Setter, update: Update) => void | Promise<void>
) {
  const key = `atom${++keyCount}`
  const config = {
    toString: () => key,
  } as WritableAtom<Value, Update> & { init?: Value }
  if (typeof read === 'function') {
    config.read = read as (get: Getter) => Value | Promise<Value>
  } else {
    config.init = read
    config.read = (get: Getter) => get(config)
    config.write = (get: Getter, set: Setter, update: Update) => {
      set(config, typeof update === 'function' ? update(get(config)) : update)
    }
  }
  if (write) {
    config.write = write
  }
  return config
}

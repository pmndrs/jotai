import {
  Read,
  Write,
  Atom,
  WritableAtom,
  WithInitialValue,
  PrimitiveAtom,
} from './types'

type AnyFunction = (...args: any[]) => any

let keyCount = 0 // global key count for all atoms

// writable derived atom
export function atom<Value, Update>(
  read: Read<Value>,
  write: Write<Update>
): WritableAtom<Value, Update>

// write-only derived atom
export function atom<Value, Update>(
  read: Value,
  write: Write<Update>
): Value extends AnyFunction
  ? never
  : WritableAtom<Value, Update> & WithInitialValue<Value>

// read-only derived atom
export function atom<Value>(read: Read<Value>): Atom<Value>

// invalid read-only derived atom
export function atom(read: AnyFunction): never

// primitive atom
export function atom<Value>(
  initialValue: Value
): PrimitiveAtom<Value> & WithInitialValue<Value>

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

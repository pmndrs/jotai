import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'
import { RESET } from './constants.ts'

type SetStateActionWithReset<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET)

// This is an internal type and not part of public API.
// Do not depend on it as it can change without notice.
type WithInitialValue<Value> = {
  init: Value
}

export function atomWithReset<Value>(initialValue: Value) {
  type Update = SetStateActionWithReset<Value>
  const anAtom = atom<Value, [Update], void>(
    initialValue,
    (get, set, update) => {
      const nextValue =
        typeof update === 'function'
          ? (update as (prev: Value) => Value | typeof RESET)(get(anAtom))
          : update

      set(anAtom, nextValue === RESET ? initialValue : nextValue)
    },
  )
  return anAtom as WritableAtom<Value, [Update], void> & WithInitialValue<Value>
}

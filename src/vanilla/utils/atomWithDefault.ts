import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'
import { RESET } from './constants.ts'

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['read']

type DefaultSetStateAction<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET)

export function atomWithDefault<Value>(
  getDefault: Read<Value, [DefaultSetStateAction<Value>], void>,
): WritableAtom<Value, [DefaultSetStateAction<Value>], void> {
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)

  if (import.meta.env?.MODE !== 'production') {
    overwrittenAtom.debugPrivate = true
  }

  const anAtom: WritableAtom<Value, [DefaultSetStateAction<Value>], void> =
    atom(
      (get, options) => {
        const overwritten = get(overwrittenAtom)
        if (overwritten !== EMPTY) {
          return overwritten
        }
        return getDefault(get, options)
      },
      (get, set, update) => {
        const newValue =
          typeof update === 'function'
            ? (update as (prev: Value) => Value)(get(anAtom))
            : update
        set(overwrittenAtom, newValue === RESET ? EMPTY : newValue)
      },
    )
  return anAtom
}

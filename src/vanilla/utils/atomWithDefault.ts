import { atom } from '../../vanilla.ts'
import type { SetStateAction, WritableAtom } from '../../vanilla.ts'
import { RESET } from './constants.ts'

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['read']

export function atomWithDefault<Value>(
  getDefault: Read<Value, [SetStateAction<Value> | typeof RESET], void>,
): WritableAtom<Value, [SetStateAction<Value> | typeof RESET], void> {
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)

  if (import.meta.env?.MODE !== 'production') {
    overwrittenAtom.debugPrivate = true
  }

  const anAtom: WritableAtom<
    Value,
    [SetStateAction<Value> | typeof RESET],
    void
  > = atom(
    (get, options) => {
      const overwritten = get(overwrittenAtom)
      if (overwritten !== EMPTY) {
        return overwritten
      }
      return getDefault(get, options)
    },
    (get, set, update) => {
      if (update === RESET) {
        set(overwrittenAtom, EMPTY)
      } else if (typeof update === 'function') {
        const prevValue = get(anAtom)
        set(overwrittenAtom, (update as (prev: Value) => Value)(prevValue))
      } else {
        set(overwrittenAtom, update)
      }
    },
  )
  return anAtom
}

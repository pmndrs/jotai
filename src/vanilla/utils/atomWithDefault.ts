import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'
import type { SetStateActionWithReset } from '../utils'
import { RESET } from './constants.ts'

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['read']

export function atomWithDefault<Value>(
  getDefault: Read<Value, [SetStateActionWithReset<Value>], void>,
): WritableAtom<Value, [SetStateActionWithReset<Value>], void> {
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)

  if (import.meta.env?.MODE !== 'production') {
    overwrittenAtom.debugPrivate = true
  }

  const anAtom: WritableAtom<Value, [SetStateActionWithReset<Value>], void> =
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

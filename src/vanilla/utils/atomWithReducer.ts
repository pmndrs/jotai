import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action?: Action) => Value,
): WritableAtom<Value, [Action?], void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action: Action) => Value,
): WritableAtom<Value, [Action], void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action: Action) => Value,
) {
  return atom(initialValue, function (this: any, get, set, action: Action) {
    set(this, reducer(get(this), action))
  })
}

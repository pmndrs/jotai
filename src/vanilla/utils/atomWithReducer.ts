import { atom } from '../../vanilla.js'
import type { WritableAtom } from '../../vanilla.js'

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
  return atom(initialValue, function (this: never, get, set, action: Action) {
    set(this, reducer(get(this), action))
  })
}

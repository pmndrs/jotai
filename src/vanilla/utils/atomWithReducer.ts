import { atom } from 'jotai/vanilla'
import type { WritableAtom } from 'jotai/vanilla'

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action?: Action) => Value
): WritableAtom<Value, [Action?], void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action: Action) => Value
): WritableAtom<Value, [Action], void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (value: Value, action: Action) => Value
) {
  const anAtom: any = atom(initialValue, (get, set, action: Action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom
}

import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a?: Action) => Value
): WritableAtom<Value, Action | undefined, void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
): WritableAtom<Value, Action, void>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
) {
  const anAtom: any = atom(initialValue, (get, set, action: Action) =>
    set(anAtom, reducer(get(anAtom) as Value, action))
  )
  return anAtom
}

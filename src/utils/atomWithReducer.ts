import { atom, WritableAtom } from 'jotai'

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a?: Action) => Value
): WritableAtom<Value, Action | undefined>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
): WritableAtom<Value, Action>

export function atomWithReducer<Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
) {
  const anAtom: any = atom(initialValue, (get, set, action: Action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom
}

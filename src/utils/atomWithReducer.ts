import { atom, WritableAtom } from 'jotai'

import type { NonFunction } from '../core/types'

export function atomWithReducer<Value, Action>(
  initialValue: NonFunction<Value>,
  reducer: (v: Value, a?: Action) => Value
): WritableAtom<Value, Action | undefined>

export function atomWithReducer<Value, Action>(
  initialValue: NonFunction<Value>,
  reducer: (v: Value, a: Action) => Value
): WritableAtom<Value, Action>

export function atomWithReducer<Value, Action>(
  initialValue: NonFunction<Value>,
  reducer: (v: Value, a: Action) => Value
) {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom
}

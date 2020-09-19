import { useCallback, useMemo } from 'react'
import { atom, WritableAtom, useAtom } from 'jotai'

import type { SetStateAction, PrimitiveAtom } from './types'

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

const RESET = Symbol()

export const atomWithReset = <Value>(initialValue: Value) => {
  type Update = SetStateAction<Value> | typeof RESET
  const anAtom: any = atom<Value, Update>(initialValue, (get, set, update) => {
    if (update === RESET) {
      set(anAtom, initialValue)
    } else {
      set(
        anAtom,
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : update
      )
    }
  })
  return anAtom as WritableAtom<Value, Update>
}

export const useResetAtom = <Value>(
  anAtom: WritableAtom<Value, typeof RESET>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, _update) => set(anAtom, RESET)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

export const useReducerAtom = <Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value
) => {
  const [state, setState] = useAtom(anAtom)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer]
  )
  return [state, dispatch] as const
}

export const atomWithReducer = <Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
) => {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom as WritableAtom<Value, Action>
}

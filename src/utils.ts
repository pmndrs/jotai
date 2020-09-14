import { useCallback, useMemo } from 'react'
import { atom, WritableAtom, useAtom } from 'jotai'

import type { NonPromise, NonFunction, PrimitiveAtom } from './types'

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

export const useReducerAtom = <Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => NonFunction<Value>
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
  initialValue: NonFunction<NonPromise<Value>>,
  reducer: (v: Value, a: Action) => Value
) => {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom as WritableAtom<Value, Action>
}

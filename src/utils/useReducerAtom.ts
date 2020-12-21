import { useCallback } from 'react'
import { useAtom, PrimitiveAtom } from 'jotai'

/* this doesn't seem to work as expected in TS4.1
export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value) => Value
): [Value, () => void]
*/

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a?: Action) => Value
): [Value, (action?: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value
): [Value, (action: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value
) {
  const [state, setState] = useAtom(anAtom)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer]
  )
  return [state, dispatch]
}

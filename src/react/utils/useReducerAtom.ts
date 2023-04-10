import { useCallback } from 'react'
import { useAtom } from '../../react.ts'
import type { PrimitiveAtom } from '../../vanilla.ts'

type Options = Parameters<typeof useAtom>[1]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a?: Action) => Value,
  options?: Options
): [Value, (action?: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  options?: Options
): [Value, (action: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  options?: Options
) {
  const [state, setState] = useAtom(anAtom, options)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer]
  )
  return [state, dispatch]
}

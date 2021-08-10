import { useCallback } from 'react'
import { useAtom } from 'jotai'
import type { PrimitiveAtom } from 'jotai'
import type { Scope } from '../core/atom'

/* this doesn't seem to work as expected in TS4.1
export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value) => Value
): [Value, () => void]
*/

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a?: Action) => Value,
  scope?: Scope
): [Value, (action?: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  scope?: Scope
): [Value, (action: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  scope?: Scope
) {
  const [state, setState] = useAtom(anAtom, scope)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer]
  )
  return [state, dispatch]
}

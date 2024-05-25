import { useCallback } from 'react'
import { useAtom } from '../../react.ts'
import type { PrimitiveAtom } from '../../vanilla.ts'

type Options = Parameters<typeof useAtom>[1]

/**
 * @deprecated please use a recipe instead
 * https://github.com/pmndrs/jotai/pull/2467
 */
export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a?: Action) => Value,
  options?: Options,
): [Value, (action?: Action) => void]

/**
 * @deprecated please use a recipe instead
 * https://github.com/pmndrs/jotai/pull/2467
 */
export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  options?: Options,
): [Value, (action: Action) => void]

export function useReducerAtom<Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value,
  options?: Options,
) {
  if (import.meta.env?.MODE !== 'production') {
    console.warn(
      '[DEPRECATED] useReducerAtom is deprecated and will be removed in the future. Please create your own version using the recipe. https://github.com/pmndrs/jotai/pull/2467',
    )
  }
  const [state, setState] = useAtom(anAtom, options)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer],
  )
  return [state, dispatch]
}

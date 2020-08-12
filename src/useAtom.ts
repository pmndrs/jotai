import { Dispatch, SetStateAction, useCallback, useEffect } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { StateContext, DispatchContext, AtomState } from './Provider'
import { Atom, WritableAtom } from './types'

const isWritable = (
  atom: Atom<unknown> | WritableAtom<unknown>
): atom is WritableAtom<unknown> => !!(atom as WritableAtom<unknown>).write

export function useAtom<Value>(
  atom: WritableAtom<Value>
): [Value, Dispatch<SetStateAction<Value>>]
export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value>(atom: Atom<Value> | WritableAtom<Value>) {
  const dispatch = useContext(DispatchContext)
  const promiseOrValue = useContextSelector(
    StateContext,
    useCallback(
      state => {
        const atomState = state.get(atom) as AtomState<Value> | undefined
        if (!atomState) return atom.default
        if (atomState.promise) return atomState.promise
        return atomState.value
      },
      [atom]
    )
  )
  const setAtom = useCallback(
    (update: SetStateAction<Value>) => {
      if (isWritable(atom)) {
        dispatch({ type: 'UPDATE_VALUE', atom, update })
      } else {
        throw new Error('not writable atom')
      }
    },
    [atom, dispatch]
  )
  useEffect(() => {
    const id = Symbol()
    dispatch({ type: 'INIT_ATOM', atom, id })
    return () => {
      dispatch({ type: 'DISPOSE_ATOM', atom, id })
    }
  }, [dispatch, atom])
  if (promiseOrValue instanceof Promise) {
    throw promiseOrValue
  }
  return [promiseOrValue, setAtom]
}

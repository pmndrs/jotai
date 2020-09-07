import { useCallback } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { StateContext, ActionsContext, AtomState } from './Provider'
import { Atom, WritableAtom, AnyWritableAtom } from './types'
import { useIsoLayoutEffect } from './utils'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [Value, (update: Update) => void]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const actions = useContext(ActionsContext)
  const promiseOrValue = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        const atomState = state.get(atom) as AtomState<Value> | undefined
        if (!atomState) return atom.initialValue
        if (atomState.promise) return atomState.promise
        return atomState.value
      },
      [atom]
    )
  )
  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        const id = Symbol()
        actions.write(id, atom as AnyWritableAtom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [atom, actions]
  )
  useIsoLayoutEffect(() => {
    const id = Symbol()
    actions.init(id, atom)
    return () => {
      actions.dispose(id)
    }
  }, [actions, atom])
  if (promiseOrValue instanceof Promise) {
    throw promiseOrValue
  }
  return [promiseOrValue, setAtom]
}

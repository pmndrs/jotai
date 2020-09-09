import { useCallback, useDebugValue } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { StateContext, ActionsContext, AtomState } from './Provider'
import { Atom, WritableAtom, AnyWritableAtom, NonPromise } from './types'
import { useIsoLayoutEffect } from './utils'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [NonPromise<Value>, (update: Update) => void]

export function useAtom<Value>(atom: Atom<Value>): [NonPromise<Value>, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const actions = useContext(ActionsContext)
  const promiseOrValue = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        const atomState = state.get(atom) as AtomState<Value> | undefined
        if (atomState) {
          return atomState.promise || atomState.value
        }
        if (atom.initialValue instanceof Promise) {
          atom.initialValue.then(() => {
            actions.init(null, atom)
          })
        }
        return atom.initialValue
      },
      [atom]
    )
  )
  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        actions.write(atom as AnyWritableAtom, update)
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
  useDebugValue(promiseOrValue)
  return [promiseOrValue, setAtom]
}

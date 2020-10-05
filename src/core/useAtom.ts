import { useCallback, useDebugValue } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { StateContext, ActionsContext } from './Provider'
import { Atom, WritableAtom, AnyWritableAtom } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

type SetAtom<Update> = undefined extends Update
  ? (update?: Update) => void | Promise<void>
  : (update: Update) => void | Promise<void>

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [Value, SetAtom<Update>]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const actions = useContext(ActionsContext)

  const value = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        const atomState = actions.read(state, atom)
        if (atomState.readE) {
          throw atomState.readE // read error
        }
        if (atomState.readP) {
          throw atomState.readP // read promise
        }
        if (atomState.writeP) {
          throw atomState.writeP // write promise
        }
        return atomState.value
      },
      [atom, actions]
    )
  )

  useIsoLayoutEffect(() => {
    const id = Symbol()
    actions.add(id, atom)
    return () => {
      actions.del(id)
    }
  }, [actions, atom])

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        return actions.write(atom as AnyWritableAtom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [atom, actions]
  )

  useDebugValue(value)
  return [value, setAtom]
}

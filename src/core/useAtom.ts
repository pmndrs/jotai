import { useEffect, useCallback, useDebugValue } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { getContexts } from './contexts'
import { Atom, WritableAtom, AnyWritableAtom } from './types'

function assertContextValue<T extends object>(x: T | null): asserts x is T {
  if (!x) {
    throw new Error(
      'Please use <Provider> or if you have scoped atoms, use <Provider scope={yourAtomScope}>'
    )
  }
}

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
  const [ActionsContext, StateContext] = getContexts(atom.scope)
  const actions = useContext(ActionsContext)
  assertContextValue(actions)

  const value = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        assertContextValue(state)
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
        return atomState.value as Value
      },
      [atom, actions]
    )
  )

  useEffect(() => {
    const id = Symbol()
    actions.add(id, atom)
    return () => {
      actions.del(id, atom)
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

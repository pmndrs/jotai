import { useEffect, useCallback, useDebugValue } from 'react'
import { useContext, useContextSelector } from 'use-context-selector'

import { getContexts } from './contexts'
import { Atom, WritableAtom, AnyWritableAtom, Scope, SetAtom } from './types'

function assertContextValue<T extends object>(
  x: T | null,
  scope?: Scope
): asserts x is T {
  if (!x) {
    throw new Error(
      `Please use <Provider${scope ? ` scope=${String(scope)}` : ''}>`
    )
  }
}

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [Value, SetAtom<Update>]

export function useAtom<Value>(atom: Atom<Value>): [Value, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const [ActionsContext, StateContext] = getContexts(atom.scope)
  const actions = useContext(ActionsContext)
  assertContextValue(actions, atom.scope)

  const value = useContextSelector(
    StateContext,
    useCallback(
      (state) => {
        assertContextValue(state)
        const atomState = actions.read(state, atom)
        if (atomState.re) {
          throw atomState.re // read error
        }
        if (atomState.rp) {
          throw atomState.rp // read promise
        }
        if (atomState.wp) {
          throw atomState.wp // write promise
        }
        if ('v' in atomState) {
          return atomState.v as Value
        }
        throw new Error('no atom value')
      },
      [atom, actions]
    )
  )

  useEffect(() => {
    const id = Symbol()
    actions.add(atom, id)
    return () => {
      actions.del(atom, id)
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

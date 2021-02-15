import { useEffect, useCallback, useDebugValue } from 'react'
import { useContextSelector } from 'use-context-selector'

import { getStoreContext } from './contexts'
import { addAtom, delAtom, readAtom, writeAtom } from './vanilla'
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
  const StoreContext = getStoreContext(atom.scope)
  const updateState = useContextSelector(
    StoreContext,
    useCallback(
      (store) => {
        assertContextValue(store, atom.scope)
        return store[1]
      },
      [atom]
    )
  )

  const value = useContextSelector(
    StoreContext,
    useCallback(
      (store) => {
        assertContextValue(store, atom.scope)
        const [state, updateState] = store
        const atomState = readAtom(state, updateState, atom)
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
      [atom]
    )
  )

  useEffect(() => {
    const id = Symbol()
    addAtom(updateState, atom, id)
    return () => {
      delAtom(updateState, atom, id)
    }
  }, [updateState, atom])

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        return writeAtom(updateState, atom as AnyWritableAtom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [updateState, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

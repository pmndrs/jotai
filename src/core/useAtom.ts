import { useContext, useCallback, useDebugValue } from 'react'

import { getStoreContext } from './contexts'
import { readAtom, writeAtom, subscribeAtom } from './vanilla'
import type { State } from './vanilla'
import type { Atom, WritableAtom, SetAtom } from './types'
import { useMutableSource } from './useMutableSource'

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
  const [mutableSource, updateState] = useContext(StoreContext)

  const getAtomValue = useCallback(
    (state: State) => {
      const atomState = readAtom(state, updateState, atom)
      if (atomState.e) {
        throw atomState.e // read error
      }
      if (atomState.p) {
        throw atomState.p // read promise
      }
      if (atomState.w) {
        throw atomState.w // write promise
      }
      if ('v' in atomState) {
        return atomState.v as Value
      }
      throw new Error('no atom value')
    },
    [updateState, atom]
  )

  const subscribe = useCallback(
    (state: State, callback: () => void) =>
      subscribeAtom(state, updateState, atom, callback),
    [updateState, atom]
  )

  const value: Value = useMutableSource(mutableSource, getAtomValue, subscribe)

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        return writeAtom(updateState, atom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [updateState, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

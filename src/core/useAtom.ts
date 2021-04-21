import { useContext, useCallback, useDebugValue } from 'react'

import { getStoreContext } from './contexts'
import { readAtom, subscribeAtom } from './vanilla'
import type { State } from './vanilla'
import type { Atom, WritableAtom, SetAtom, NonPromise } from './types'
import { useMutableSource } from './useMutableSource'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): [NonPromise<Value>, SetAtom<Update>]

export function useAtom<Value>(atom: Atom<Value>): [NonPromise<Value>, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
) {
  const getAtomValue = useCallback(
    (state: State) => {
      const atomState = readAtom(state, atom)
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
        return atomState.v as NonPromise<Value>
      }
      throw new Error('no atom value')
    },
    [atom]
  )

  const subscribe = useCallback(
    (state: State, callback: () => void) =>
      subscribeAtom(state, atom, callback),
    [atom]
  )

  const StoreContext = getStoreContext(atom.scope)
  const [mutableSource, updateAtom] = useContext(StoreContext)
  const value: NonPromise<Value> = useMutableSource(
    mutableSource,
    getAtomValue,
    subscribe
  )

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        return updateAtom(atom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [updateAtom, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

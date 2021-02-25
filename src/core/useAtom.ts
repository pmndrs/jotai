import { useContext, useEffect, useCallback, useDebugValue } from 'react'

import { getStoreContext, subscribeToStore } from './contexts'
import {
  State,
  UpdateState,
  addAtom,
  delAtom,
  readAtom,
  writeAtom,
} from './vanilla'
import { Atom, WritableAtom, AnyWritableAtom, SetAtom } from './types'
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
  const getAtomValue = useCallback(
    (state: State, updateState: UpdateState) => {
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

  const StoreContext = getStoreContext(atom.scope)
  const [mutableSource, updateState] = useContext(StoreContext)
  const value: Value = useMutableSource(
    mutableSource,
    useCallback(
      (store: any) => {
        const state = store.s()
        return getAtomValue(state, updateState)
      },
      [getAtomValue, updateState]
    ),
    subscribeToStore
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

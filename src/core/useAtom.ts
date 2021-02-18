import {
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useDebugValue,
} from 'react'

import { Store, getStoreContext, subscribeToStore } from './contexts'
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
  type Selected = {
    v: Value
    u: UpdateState
  }
  const { v: value, u: updateState }: Selected = useMutableSource(
    useContext(StoreContext),
    useMemo(() => {
      let selected: Selected | null = null
      return (store: Store) => {
        const { s: state, u: updateState } = store
        const v = getAtomValue(state, updateState)
        if (!selected || !Object.is(selected.v, v)) {
          selected = { v, u: updateState }
        }
        return selected
      }
    }, [getAtomValue]),
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

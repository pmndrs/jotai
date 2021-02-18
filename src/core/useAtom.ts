import { useEffect, useCallback, useMemo, useDebugValue } from 'react'
import { useContextSelector } from 'use-context-selector'

import { getStoreContext, MutableSource } from './contexts'
import {
  State,
  UpdateState,
  addAtom,
  delAtom,
  readAtom,
  writeAtom,
} from './vanilla'
import { Atom, WritableAtom, AnyWritableAtom, SetAtom } from './types'
import { createMutableSource, useMutableSource } from './useMutableSource'

const dummyMutableSource = createMutableSource({}, () => -1)

const subscribe = (source: { l?: Set<() => void> }, callback: () => void) => {
  const { l: listeners } = source
  if (listeners) {
    listeners.add(callback)
  }
  return () => {
    if (listeners) {
      listeners.delete(callback)
    }
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
  type SelectedFromContext = {
    v?: Value
    u: UpdateState
    m?: MutableSource
  }
  const selectedFromContext: SelectedFromContext = useContextSelector(
    StoreContext,
    useMemo(() => {
      let prev: SelectedFromContext | null = null
      return (store) => {
        if (!('s' in store)) {
          // provider-less mode
          return store
        }
        const { s: state, u: updateState } = store
        const v = getAtomValue(state, updateState)
        if (!prev || !Object.is(prev.v, v)) {
          prev = { v, u: updateState }
        }
        return prev
      }
    }, [getAtomValue])
  )

  const { u: updateState, m: mutableSource } = selectedFromContext

  const valueFromMutableSource: Value | null = useMutableSource(
    mutableSource || dummyMutableSource,
    useCallback(
      (source: { s?: State }) => {
        const { s: state } = source
        if (state) {
          return getAtomValue(state, updateState)
        }
        return null
      },
      [getAtomValue, updateState]
    ),
    subscribe
  )

  const value =
    'v' in selectedFromContext
      ? (selectedFromContext.v as Value)
      : (valueFromMutableSource as Value)

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

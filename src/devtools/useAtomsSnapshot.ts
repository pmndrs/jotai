import { useCallback, useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import { AtomState, State, subscribeAtom } from '../core/vanilla'
import { RegisteredAtomsContext } from '../core/contexts'
import { useMutableSource } from '../core/useMutableSource'
import { AnyAtom } from '../core/types'

// This is not done at all, slowing iterating on the API.

export function useAtomsSnapshot() {
  const StoreContext = getStoreContext()
  const [mutableSource] = useContext(StoreContext)
  const atoms = useContext(RegisteredAtomsContext)

  const subscribe = useCallback(
    (state: State, callback: () => void) => {
      // FIXME we don't need to resubscribe, just need to subscribe for new one
      const unsubs = atoms.map((atom) => subscribeAtom(state, atom, callback))
      return () => {
        unsubs.forEach((unsub) => unsub())
      }
    },
    [atoms]
  )
  const state: State = useMutableSource(mutableSource, getState, subscribe)

  return useMemo(() => {
    const atomToAtomStateTuples = atoms
      .filter((atom) => !!state.m.get(atom))
      .map<[AnyAtom, unknown]>((atom) => {
        const atomState = state.a.get(atom) ?? ({} as AtomState)
        return [atom, atomState.e || atomState.p || atomState.w || atomState.v]
      })
    return new Map(atomToAtomStateTuples)
  }, [atoms, state])
}

const getState = (state: State) => ({ ...state }) // shallow copy

import { useCallback, useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { AnyAtom } from '../core/types'
import type { AtomState, State } from '../core/vanilla'

// FIXME across bundles, may or may not work
import { subscribeAtom } from '../core/vanilla'
import { useMutableSource } from '../core/useMutableSource'
import { getDevState, getDevAtoms, subscribeDevAtoms } from '../core/Provider'

type AtomsSnapshot = Map<AnyAtom, unknown>

export function useAtomsSnapshot(): AtomsSnapshot {
  const StoreContext = getStoreContext()
  const [mutableSource, , atomsMutableSource] = useContext(StoreContext)

  if (atomsMutableSource === undefined) {
    throw Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const atoms: AnyAtom[] = useMutableSource(
    atomsMutableSource,
    getDevAtoms,
    subscribeDevAtoms
  )

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
  const state: State = useMutableSource(mutableSource, getDevState, subscribe)

  return useMemo(() => {
    const atomToAtomValueTuples = atoms
      .filter((atom) => !!state.m.get(atom))
      .map<[AnyAtom, unknown]>((atom) => {
        const atomState = state.a.get(atom) ?? ({} as AtomState)
        return [atom, atomState.e || atomState.p || atomState.w || atomState.v]
      })
    return new Map(atomToAtomValueTuples)
  }, [atoms, state])
}

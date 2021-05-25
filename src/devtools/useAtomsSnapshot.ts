import { useContext, useMemo } from 'react'
import {
  SECRET_INTERNAL_getStoreContext as getStoreContext,
  SECRET_INTERNAL_useMutableSource as useMutableSource,
} from 'jotai'
import type { AnyAtom, Scope } from '../core/types'
import type { AtomState, State } from '../core/vanilla'

import { getDebugStateAndAtoms, subscribeDebugStore } from '../core/Provider'

type AtomsSnapshot = Map<AnyAtom, unknown>

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const StoreContext = getStoreContext(scope)
  const [, , debugMutableSource] = useContext(StoreContext)

  if (debugMutableSource === undefined) {
    throw Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [state, atoms]: [State, AnyAtom[]] = useMutableSource(
    debugMutableSource,
    getDebugStateAndAtoms,
    subscribeDebugStore
  )

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

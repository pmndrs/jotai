import { useContext } from 'react'
import {
  SECRET_INTERNAL_getScopeContext as getScopeContext,
  SECRET_INTERNAL_useMutableSource as useMutableSource,
} from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  getDebugStateAndAtoms,
  subscribeDebugScopeContainer,
} from '../core/Provider'
import type { AtomState } from '../core/vanilla'
// NOTE importing from '../core/Provider' is across bundles and actually copying code

type AtomsSnapshot = Map<Atom<unknown>, unknown>

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const ScopeContext = getScopeContext(scope)
  const debugMutableSource = useContext(ScopeContext)[4]

  if (debugMutableSource === undefined) {
    throw Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [state, atoms] = useMutableSource(
    debugMutableSource,
    getDebugStateAndAtoms,
    subscribeDebugScopeContainer
  )

  const atomToAtomValueTuples = atoms
    .filter((atom) => !!state.m.get(atom))
    .map<[Atom<unknown>, unknown]>((atom) => {
      const atomState = state.a.get(atom) ?? ({} as AtomState)
      return [atom, atomState.e || atomState.p || atomState.w || atomState.v]
    })
  return new Map(atomToAtomValueTuples)
}

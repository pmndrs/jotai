import { useContext, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
// NOTE importing from '../core/contexts' is across bundles and actually copying code
import { isDevScopeContainer } from '../core/contexts'
import { DEV_GET_ATOM_STATE, DEV_GET_MOUNTED } from '../core/store'
import type { AtomState } from '../core/store'

type AtomsSnapshot = Map<Atom<unknown>, unknown>

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)

  if (!isDevScopeContainer(scopeContainer)) {
    throw Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [store, devStore] = scopeContainer

  const [atoms, setAtoms] = useState(devStore.atoms)
  useEffect(() => {
    const callback = () => setAtoms(devStore.atoms)
    const unsubscribe = devStore.subscribe(callback)
    callback()
    return unsubscribe
  }, [devStore])

  const atomToAtomValueTuples = atoms
    .filter((atom) => !!store[DEV_GET_MOUNTED]?.(atom))
    .map<[Atom<unknown>, unknown]>((atom) => {
      const atomState = store[DEV_GET_ATOM_STATE]?.(atom) ?? ({} as AtomState)
      return [atom, atomState.v]
    })
  return new Map(atomToAtomValueTuples)
}

import { useContext, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from '../core/store'
import type { AtomState, Store } from '../core/store'

type AtomsSnapshot = Map<Atom<unknown>, unknown>

const createAtomsSnapshot = (
  store: Store,
  atoms: Atom<unknown>[]
): AtomsSnapshot => {
  const tuples = atoms.map<[Atom<unknown>, unknown]>((atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom) ?? ({} as AtomState)
    return [atom, atomState.v]
  })
  return new Map(tuples)
}

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(
    () => new Map()
  )

  useEffect(() => {
    const callback = (updatedAtom?: Atom<unknown>, isNewAtom?: boolean) => {
      const atoms = Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || [])
      if (updatedAtom && isNewAtom && !atoms.includes(updatedAtom)) {
        atoms.push(updatedAtom)
      }
      setAtomsSnapshot(createAtomsSnapshot(store, atoms))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  return atomsSnapshot
}

import { useContext, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from '../core/store'
import type { AtomState, Store } from '../core/store'

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = Readonly<{
  values: AtomsValues
  dependents: AtomsDependents
}>

const createAtomsSnapshot = (
  store: Store,
  atoms: Atom<unknown>[]
): AtomsSnapshot => {
  const tuples = atoms.map<[Atom<unknown>, unknown]>((atom) => {
    const atomState = store[DEV_GET_ATOM_STATE]?.(atom) ?? ({} as AtomState)
    return [atom, 'v' in atomState ? atomState.v : undefined]
  })
  const dependants = atoms.map<[Atom<unknown>, Set<Atom<unknown>>]>((atom) => {
    const mounted = store[DEV_GET_MOUNTED]?.(atom)
    return [atom, mounted?.t ?? new Set()]
  })

  return { values: new Map(tuples), dependents: new Map(dependants) }
}

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useAtomsSnapshot can only be used in dev mode.')
  }

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(() => ({
    values: new Map(),
    dependents: new Map(),
  }))

  useEffect(() => {
    const callback = () => {
      const atoms = Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || [])
      setAtomsSnapshot(createAtomsSnapshot(store, atoms))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  return atomsSnapshot
}

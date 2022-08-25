import { useContext, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from '../core/store'

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = Readonly<{
  values: AtomsValues
  dependents: AtomsDependents
}>

const isEqualAtomsValues = (left: AtomsValues, right: AtomsValues) =>
  left.size === right.size &&
  Array.from(left).every(([left, v]) => Object.is(right.get(left), v))

const isEqualAtomsDependents = (
  left: AtomsDependents,
  right: AtomsDependents
) =>
  left.size === right.size &&
  Array.from(left).every(([a, dLeft]) => {
    const dRight = right.get(a)
    return (
      dRight &&
      dLeft.size === dRight.size &&
      Array.from(dLeft).every((d) => dRight.has(d))
    )
  })

export function useAtomsSnapshot(scope?: Scope): AtomsSnapshot {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(() => ({
    values: new Map(),
    dependents: new Map(),
  }))

  useEffect(() => {
    let prevValues: AtomsValues = new Map()
    let prevDependents: AtomsDependents = new Map()
    const invalidatedAtoms = new Set<AnyAtom>()
    const callback = () => {
      const values: AtomsValues = new Map()
      const dependents: AtomsDependents = new Map()
      let hasNewInvalidatedAtoms = false
      for (const atom of store[DEV_GET_MOUNTED_ATOMS]?.() || []) {
        const atomState = store[DEV_GET_ATOM_STATE]?.(atom)
        if (atomState) {
          if (!atomState.y) {
            if ('p' in atomState) {
              // ignore entirely if we have invalidated promise atoms
              return
            }
            if (!invalidatedAtoms.has(atom)) {
              invalidatedAtoms.add(atom)
              hasNewInvalidatedAtoms = true
            }
          }
          if ('v' in atomState) {
            values.set(atom, atomState.v)
          }
        }
        const mounted = store[DEV_GET_MOUNTED]?.(atom)
        if (mounted) {
          dependents.set(atom, mounted.t)
        }
      }
      if (hasNewInvalidatedAtoms) {
        // ignore entirely if we have new invalidated atoms
        return
      }
      if (
        isEqualAtomsValues(prevValues, values) &&
        isEqualAtomsDependents(prevDependents, dependents)
      ) {
        // not changed
        return
      }
      prevValues = values
      prevDependents = dependents
      invalidatedAtoms.clear()
      setAtomsSnapshot({ values, dependents })
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])

  return atomsSnapshot
}

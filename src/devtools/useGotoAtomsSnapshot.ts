import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import { DEV_SUBSCRIBE_STATE, RESTORE_ATOMS } from '../core/store'

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = Readonly<{
  values: AtomsValues
  dependents: AtomsDependents
}>

/**
 * @deprecated use object snapshot instead
 */
type DeprecatedIterableSnapshot = Iterable<readonly [AnyAtom, AnyAtomValue]>

export function useGotoAtomsSnapshot(scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)

  return useCallback(
    (snapshot: AtomsSnapshot | DeprecatedIterableSnapshot) => {
      if (!__DEV__) return

      const restoreAtoms = (
        values: Iterable<readonly [AnyAtom, AnyAtomValue]>
      ) => {
        if (versionedWrite) {
          versionedWrite((version) => {
            store[RESTORE_ATOMS](values, version)
          })
        } else {
          store[RESTORE_ATOMS](values)
        }
      }
      if (isIterable(snapshot)) {
        if (__DEV__) {
          console.warn(
            'snapshot as iterable is deprecated. use an object instead.'
          )
        }
        restoreAtoms(snapshot)
        return
      }
      restoreAtoms(snapshot.values)
    },
    [store, versionedWrite]
  )
}

const isIterable = (item: any): item is Iterable<any> => {
  return typeof item[Symbol.iterator] === 'function'
}

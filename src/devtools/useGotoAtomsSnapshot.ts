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

export function useGotoAtomsSnapshot(scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }

  return useCallback(
    (values: Iterable<readonly [Atom<unknown>, unknown]> | AtomsSnapshot) => {
      if (isIterable(values)) {
        if (__DEV__) {
          console.warn(
            'snapshot as iterable is no longer supported. use an object instead.'
          )
        }
        store[RESTORE_ATOMS](values)
        return
      }
      store[RESTORE_ATOMS](values.values)
    },
    [store]
  )
}

function isIterable(item: any): item is Iterable<any> {
  return typeof item[Symbol.iterator] === 'function'
}

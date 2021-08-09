import { useContext, useRef } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown>, unknown]>,
  scope?: Scope
) {
  const hasRestoredRef = useRef(false)
  const StoreContext = getStoreContext(scope)
  const restoreAtoms = useContext(StoreContext)[3]

  if (!hasRestoredRef.current) {
    hasRestoredRef.current = true
    restoreAtoms(values)
  }
}

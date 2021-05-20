import { useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Scope } from '../core/types'

import { isDevStore } from '../core/contexts'

export function useGotoAtomsSnapshot(scope?: Scope) {
  const StoreContext = getStoreContext(scope)
  const store = useContext(StoreContext)

  if (!isDevStore(store)) {
    throw Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }
  const restoreAtoms = store[3]
  return restoreAtoms
}

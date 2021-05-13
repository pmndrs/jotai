import { useCallback, useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Scope } from '../core/types'

import { isDevStore } from '../core/Provider'

export function useGoToAtomsSnapshot(scope?: Scope) {
  const StoreContext = getStoreContext(scope)
  const store = useContext(StoreContext)

  if (!isDevStore(store)) {
    throw Error('useGoToAtomsSnapshot can only be used in dev mode.')
  }
  const restoreAtoms = store[3]
  return useCallback<(...args: Parameters<typeof restoreAtoms>) => void>(
    (...args) => {
      restoreAtoms(...args)
    },
    [restoreAtoms]
  )
}

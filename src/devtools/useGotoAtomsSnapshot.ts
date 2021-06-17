import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'

import type { Scope } from '../core/atom'
// NOTE this is across bundles and actually copying code
import { isDevStore } from '../core/contexts'

export function useGotoAtomsSnapshot(scope?: Scope) {
  const StoreContext = getStoreContext(scope)
  const store = useContext(StoreContext)

  if (!isDevStore(store)) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }
  const restore = store[4]
  return useCallback(
    (values: Parameters<typeof restore>[0]) => {
      for (const [atom] of values) {
        if (atom.scope !== scope) {
          throw new Error('atom scope mismatch to restore')
        }
      }
      restore(values)
    },
    [restore, scope]
  )
}

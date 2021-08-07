import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Scope } from '../core/atom'
import { isDevStore } from '../core/contexts'
// NOTE importing from '../core/contexts' is across bundles and actually copying code

export function useGotoAtomsSnapshot(scope?: Scope) {
  const StoreContext = getStoreContext(scope)
  const store = useContext(StoreContext)

  if (!isDevStore(store)) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }
  const restore = store[4]
  return useCallback(
    (values: Parameters<typeof restore>[0]) => {
      restore(values)
    },
    [restore]
  )
}

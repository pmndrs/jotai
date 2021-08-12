import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Scope } from '../core/atom'
import { isDevScopeContainer } from '../core/contexts'
// NOTE importing from '../core/contexts' is across bundles and actually copying code

export function useGotoAtomsSnapshot(scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)

  if (!isDevScopeContainer(scopeContainer)) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }
  const restore = scopeContainer[3]
  return useCallback(
    (values: Parameters<typeof restore>[0]) => {
      restore(values)
    },
    [restore]
  )
}

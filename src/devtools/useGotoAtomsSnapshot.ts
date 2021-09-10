import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
// NOTE importing from '../core/contexts' is across bundles and actually copying code
import { isDevScopeContainer } from '../core/contexts'
import { RESTORE_ATOMS } from '../core/store'

export function useGotoAtomsSnapshot(scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)

  if (!isDevScopeContainer(scopeContainer)) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }

  const store = scopeContainer[0]
  return useCallback(
    (values: Iterable<readonly [Atom<unknown>, unknown]>) => {
      store[RESTORE_ATOMS](values)
    },
    [store]
  )
}

import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import { DEV_SUBSCRIBE_STATE, RESTORE_ATOMS } from '../core/store'

export function useGotoAtomsSnapshot(scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const store = scopeContainer.s

  if (!store[DEV_SUBSCRIBE_STATE]) {
    throw new Error('useGotoAtomsSnapshot can only be used in dev mode.')
  }

  return useCallback(
    (values: Iterable<readonly [Atom<unknown>, unknown]>) => {
      store[RESTORE_ATOMS](values)
    },
    [store]
  )
}

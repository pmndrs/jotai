import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Scope } from '../core/atom'
import { WRITE_ATOM } from '../core/store'
import { RESET } from './constants'

export function useResetAtom<Value>(
  anAtom: WritableAtom<Value, typeof RESET, void>,
  scope?: Scope
) {
  const ScopeContext = getScopeContext(scope)
  const store = useContext(ScopeContext)[0]
  const setAtom = useCallback(
    () => store[WRITE_ATOM](anAtom, RESET),
    [store, anAtom]
  )
  return setAtom
}

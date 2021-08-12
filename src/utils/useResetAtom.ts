import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Scope } from '../core/atom'
import { RESET } from './constants'

export function useResetAtom<Value>(
  anAtom: WritableAtom<Value, typeof RESET>,
  scope?: Scope
) {
  const ScopeContext = getScopeContext(scope)
  const [, updateAtom] = useContext(ScopeContext)
  const setAtom = useCallback(
    () => updateAtom(anAtom, RESET),
    [updateAtom, anAtom]
  )
  return setAtom
}

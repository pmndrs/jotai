import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Scope, SetAtom } from '../core/atom'

export function useUpdateAtom<Value, Update>(
  anAtom: WritableAtom<Value, Update>,
  scope?: Scope
) {
  const ScopeContext = getScopeContext(scope)
  const [, updateAtom] = useContext(ScopeContext)
  const setAtom = useCallback(
    (update: Update) => updateAtom(anAtom, update),
    [updateAtom, anAtom]
  )
  return setAtom as SetAtom<Update>
}

import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import { WRITE_ATOM } from '../core/store'
import { RESET } from './constants'

type Scope = NonNullable<Parameters<typeof getScopeContext>[0]>

export function useResetAtom<Value>(
  anAtom: WritableAtom<Value, typeof RESET>,
  scope?: Scope
) {
  const ScopeContext = getScopeContext(scope)
  const store = useContext(ScopeContext).s
  const setAtom = useCallback(
    () => store[WRITE_ATOM](anAtom, RESET),
    [store, anAtom]
  )
  return setAtom
}

import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Scope } from '../core/atom'
import { RESET } from './constants'

export function useResetAtom<Value>(
  anAtom: WritableAtom<Value, typeof RESET>,
  scope?: Scope
) {
  const StoreContext = getStoreContext(scope)
  const [, updateAtom] = useContext(StoreContext)
  const setAtom = useCallback(
    () => updateAtom(anAtom, RESET),
    [updateAtom, anAtom]
  )
  return setAtom
}

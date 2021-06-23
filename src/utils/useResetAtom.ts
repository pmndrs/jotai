import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { WritableAtom } from 'jotai'

export const RESET = Symbol()

export function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>) {
  const StoreContext = getStoreContext(anAtom.scope)
  const [, updateAtom] = useContext(StoreContext)
  const setAtom = useCallback(
    () => updateAtom(anAtom, RESET),
    [updateAtom, anAtom]
  )
  return setAtom
}

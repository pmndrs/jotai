import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import { RESET } from './atomWithReset'

export function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>) {
  const StoreContext = getStoreContext(anAtom.scope)
  const [, updateAtom] = useContext(StoreContext)
  // FIXME Remove _update before v1, stays to not introduce breaking change
  const setAtom = useCallback((_update) => updateAtom(anAtom, RESET), [
    updateAtom,
    anAtom,
  ])
  return setAtom
}

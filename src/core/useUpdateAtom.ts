import { useCallback, useContext } from 'react'
import { getStoreContext } from './contexts'
import type { WritableAtom, SetAtom } from './types'

export function useUpdateAtom<Value, Update>(
  atom: WritableAtom<Value, Update>
): SetAtom<Update> {
  const StoreContext = getStoreContext(atom.scope)
  const [, updateAtom] = useContext(StoreContext)
  const setAtom = useCallback((update: Update) => updateAtom(atom, update), [
    updateAtom,
    atom,
  ])
  return setAtom as SetAtom<Update>
}

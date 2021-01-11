import { useMemo } from 'react'
import { atom, useAtom, WritableAtom } from 'jotai'
import { RESET } from './atomWithReset'

export function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>) {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, _update) => set(anAtom, RESET)),
    [anAtom]
  )
  writeOnlyAtom.scope = anAtom.scope
  return useAtom(writeOnlyAtom)[1]
}

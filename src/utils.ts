import { useMemo } from 'react'
import { atom, WritableAtom, useAtom } from 'jotai'

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

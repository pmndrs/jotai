import { useMemo } from 'react'
import { atom, useAtom, WritableAtom } from 'jotai'

export function useUpdateAtom<Value, Update>(
  anAtom: WritableAtom<Value, Update>
) {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  writeOnlyAtom.scope = anAtom.scope
  return useAtom(writeOnlyAtom)[1]
}

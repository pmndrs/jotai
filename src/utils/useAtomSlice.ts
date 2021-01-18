import { useMemo } from 'react'
import { useAtom, WritableAtom } from 'jotai'

import { sliceAtom } from './sliceAtom'

export const useAtomSlice = <Item>(arrAtom: WritableAtom<Item[], Item[]>) => {
  const [atoms, remove] = useAtom(useMemo(() => sliceAtom(arrAtom), [arrAtom]))
  return useMemo(
    () => atoms.map((itemAtom) => [itemAtom, () => remove(itemAtom)] as const),
    [atoms, remove]
  )
}

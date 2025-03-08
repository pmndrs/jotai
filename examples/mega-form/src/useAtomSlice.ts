import { useMemo } from 'react'
import { useAtom } from 'jotai'
import type { PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'

const useAtomSlice = <Item>(arrAtom: PrimitiveAtom<Item[]>) => {
  const [atoms, dispatch] = useAtom(
    useMemo(() => splitAtom(arrAtom), [arrAtom]),
  )
  return useMemo(
    () =>
      atoms.map(
        (itemAtom) =>
          [
            itemAtom,
            () => dispatch({ type: 'remove', atom: itemAtom }),
          ] as const,
      ),
    [atoms, dispatch],
  )
}

export default useAtomSlice

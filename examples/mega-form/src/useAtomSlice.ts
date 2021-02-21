import * as React from 'react'
import { useAtom, PrimitiveAtom } from 'jotai'
import { splitAtom } from 'jotai/utils'

const useAtomSlice = <Item>(arrAtom: PrimitiveAtom<Item[]>) => {
  const [atoms, remove] = useAtom(
    React.useMemo(() => splitAtom(arrAtom), [arrAtom])
  )
  return React.useMemo(
    () => atoms.map((itemAtom) => [itemAtom, () => remove(itemAtom)] as const),
    [atoms, remove]
  )
}

export default useAtomSlice

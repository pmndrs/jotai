import { useCallback, useMemo } from 'react'
import { PrimitiveAtom } from 'jotai'

// TODO can't use utils
import { atomFamily, useAtomCallback, useSelector } from '../utils'

import type { SetStateAction } from '../core/types'

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export const useAtomSlice = <Item>(atom: PrimitiveAtom<Array<Item>>) => {
  const atomFamilyGetter = useMemo(() => {
    return atomFamily<number, Item, SetStateAction<Item>>(
      (index) => (get) => {
        // Kindly coercing this from `Item | undefined` to `Item`
        return get(atom)[index]
      },
      (index) => (_, set, update) => {
        set(atom, (superState) => {
          return [
            ...superState.slice(0, index),
            isFunction(update) ? update(superState[index]) : update,
            ...superState.slice(index + 1),
          ]
        })
      }
    )
  }, [atom])

  const removeItem = useAtomCallback<void, number>(
    useCallback(
      (_get, set, index) => {
        set(atom, (oldArr) => [
          ...oldArr.slice(0, index),
          ...oldArr.slice(index + 1),
        ])
      },
      [atom]
    )
  )

  return useSelector(
    atom,
    useMemo(() => {
      return (elements) => {
        const length = elements.length
        return Array.from(new Array(length)).map(
          (_, key) => [atomFamilyGetter(key), () => removeItem(key)] as const
        )
      }
    }, [atomFamilyGetter, removeItem]),
    (left, right) => left && left.length === right.length
  )
}

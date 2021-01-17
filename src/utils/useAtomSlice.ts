import { PrimitiveAtom } from 'jotai'
import React from 'react'
import { SetStateAction } from '../core/types'
import { atomFamily, useAtomCallback, useSelector } from '../utils'

export const useAtomSlice = <Element>(atom: PrimitiveAtom<Array<Element>>) => {
  const atomFamilyGetter = React.useMemo(() => {
    return atomFamily<number, Element, SetStateAction<Element>>(
      (index) => (get) => {
        // Kindly coercing this from `Element | undefined` to `Element`
        return get(atom)[index]
      },
      (index) => (_, set, update) => {
        set(atom, (superState) => {
          return [
            ...superState.slice(0, index),
            update instanceof Function ? update(superState[index]) : update,
            ...superState.slice(index + 1),
          ]
        })
      }
    )
  }, [atom])

  const removeItem = useAtomCallback<void, number>(
    React.useCallback(
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
    React.useMemo(() => {
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

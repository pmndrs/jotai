import { useCallback, useMemo } from 'react'
import { WritableAtom } from 'jotai'

import { atomFamily, useAtomCallback, useSelector } from '.'

import type { SetStateAction } from '../core/types'

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export const useAtomSlice = <Item>(atom: WritableAtom<Item[], Item[]>) => {
  const atomFamilyGetter = useMemo(() => {
    return atomFamily<number, Item, SetStateAction<Item>>(
      (index) => (get) => {
        // Kindly coercing this from `Item | undefined` to `Item`
        return get(atom)[index]
      },
      (index) => (get, set, update) => {
        const prev = get(atom)
        set(atom, [
          ...prev.slice(0, index),
          isFunction(update) ? update(prev[index]) : update,
          ...prev.slice(index + 1),
        ])
      }
    )
  }, [atom])

  const removeItem = useAtomCallback<void, number>(
    useCallback(
      (get, set, index) => {
        const prev = get(atom)
        set(atom, [...prev.slice(0, index), ...prev.slice(index + 1)])
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

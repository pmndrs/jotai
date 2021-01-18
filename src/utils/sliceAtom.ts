import { atom, PrimitiveAtom, WritableAtom } from 'jotai'

import type { SetStateAction } from '../core/types'

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export const sliceAtom = <Item>(
  arrAtom: WritableAtom<Item[], Item[]>,
  keyExtractor: (item: Item, index: number) => unknown = (_, i) => i
) => {
  // FIXME potential memory leak
  const indexCache = new Map<unknown, number>()
  const itemCache = new Map<unknown, Item>()
  const atomCache = new Map<unknown, PrimitiveAtom<Item>>()
  let prevSliced: PrimitiveAtom<Item>[] | undefined
  const slicedAtom = atom(
    (get) => {
      let nextSliced: PrimitiveAtom<Item>[] = []
      let changed = false
      get(arrAtom).forEach((item, index) => {
        const key = keyExtractor(item, index)
        if (indexCache.get(key) !== index) {
          indexCache.set(key, index)
          changed = true
        }
        itemCache.set(key, item)
        if (atomCache.has(key)) {
          nextSliced[index] = atomCache.get(key) as PrimitiveAtom<Item>
          return
        }
        const itemAtom = atom(
          (get) => {
            get(arrAtom)
            return itemCache.get(key) as Item
          },
          (get, set, update: SetStateAction<Item>) => {
            const index = indexCache.get(key) as number
            const prev = get(arrAtom)
            set(arrAtom, [
              ...prev.slice(0, index),
              isFunction(update) ? update(prev[index]) : update,
              ...prev.slice(index + 1),
            ])
          }
        )
        atomCache.set(key, itemAtom)
        nextSliced[index] = itemAtom
      })
      if (prevSliced && !changed) {
        return prevSliced
      }
      prevSliced = nextSliced
      return nextSliced
    },
    (get, set, atomToRemove: PrimitiveAtom<Item>) => {
      const index = get(slicedAtom).indexOf(atomToRemove)
      if (index >= 0) {
        // XXX this is slow
        const key = [...atomCache.entries()].find(
          ([_i, a]) => a === atomToRemove
        )?.[0]
        indexCache.delete(key)
        itemCache.delete(key)
        atomCache.delete(key)
        const prev = get(arrAtom)
        set(arrAtom, [...prev.slice(0, index), ...prev.slice(index + 1)])
      }
    }
  )
  return slicedAtom
}

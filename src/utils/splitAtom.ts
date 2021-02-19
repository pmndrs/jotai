import { atom, PrimitiveAtom, WritableAtom } from 'jotai'

import type { SetStateAction } from '../core/types'

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export const splitAtom = <Item, Key = unknown>(
  arrAtom: WritableAtom<Item[], Item[]>,
  keyExtractor?: (item: Item) => Key
) => {
  // XXX potential memory leak when removing an item from upstream
  const indexCache = new Map<Key, number>()
  const atomCache = new Map<Key, PrimitiveAtom<Item>>()
  const atomToKey = new WeakMap<PrimitiveAtom<Item>, Key>()
  let prevSplitted: PrimitiveAtom<Item>[] | undefined
  const splittedAtom = atom(
    (get) => {
      let nextSplitted: PrimitiveAtom<Item>[] = []
      let changed = false
      get(arrAtom).forEach((item, index) => {
        const key = keyExtractor
          ? keyExtractor(item)
          : ((index as unknown) as Key)
        if (indexCache.get(key) !== index) {
          indexCache.set(key, index)
          changed = true
        }
        const cachedAtom = atomCache.get(key)
        // XXX if it's changed from upstream atom will be re-created
        if (cachedAtom && Object.is(get(cachedAtom), item)) {
          nextSplitted[index] = cachedAtom
          return
        }
        const itemAtom = atom(
          item,
          (get, set, update: SetStateAction<Item>) => {
            const index = indexCache.get(key) as number
            const prev = get(arrAtom)
            const nextItem = isFunction(update) ? update(prev[index]) : update
            set(itemAtom, nextItem)
            set(arrAtom, [
              ...prev.slice(0, index),
              nextItem,
              ...prev.slice(index + 1),
            ])
          }
        )
        atomCache.set(key, itemAtom)
        atomToKey.set(itemAtom, key)
        nextSplitted[index] = itemAtom
      })
      if (
        !changed &&
        prevSplitted &&
        prevSplitted.length === nextSplitted.length
      ) {
        return prevSplitted
      }
      return (prevSplitted = nextSplitted)
    },
    (get, set, atomToRemove: PrimitiveAtom<Item>) => {
      const index = get(splittedAtom).indexOf(atomToRemove)
      if (index >= 0) {
        const key = atomToKey.get(atomToRemove) as Key
        indexCache.delete(key)
        atomCache.delete(key)
        const prev = get(arrAtom)
        set(arrAtom, [...prev.slice(0, index), ...prev.slice(index + 1)])
      }
    }
  )
  return splittedAtom
}

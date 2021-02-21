import { atom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { Getter, Setter, SetStateAction } from '../core/types'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export function splitAtom<Item, Key = unknown>(
  arrAtom: WritableAtom<Item[], Item[]>,
  keyExtractor?: (item: Item) => Key
): WritableAtom<PrimitiveAtom<Item>[], PrimitiveAtom<Item>>

export function splitAtom<Item, Key = unknown>(
  arrAtom: Atom<Item[]>,
  keyExtractor?: (item: Item) => Key
): Atom<Atom<Item>[]>

export function splitAtom<Item, Key = unknown>(
  arrAtom: WritableAtom<Item[], Item[]> | Atom<Item[]>,
  keyExtractor?: (item: Item) => Key
) {
  type ItemAtom = PrimitiveAtom<Item> | Atom<Item>
  // XXX potential memory leak when removing an item from upstream
  const indexCache = new Map<Key, number>()
  const atomCache = new Map<Key, ItemAtom>()
  const atomToKey = new WeakMap<ItemAtom, Key>()
  let prevSplitted: ItemAtom[] | undefined
  const read = (get: Getter) => {
    let nextSplitted: Atom<Item>[] = []
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
      const itemAtom = isWritable(arrAtom)
        ? atom(item, (get, set, update: SetStateAction<Item>) => {
            const index = indexCache.get(key) as number
            const prev = get(arrAtom)
            const nextItem = isFunction(update) ? update(prev[index]) : update
            set(itemAtom as PrimitiveAtom<Item>, nextItem)
            set(arrAtom, [
              ...prev.slice(0, index),
              nextItem,
              ...prev.slice(index + 1),
            ])
          })
        : atom(() => item)
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
  }
  const write = (get: Getter, set: Setter, atomToRemove: ItemAtom) => {
    const index = get(splittedAtom).indexOf(atomToRemove)
    if (index >= 0) {
      const key = atomToKey.get(atomToRemove) as Key
      indexCache.delete(key)
      atomCache.delete(key)
      const prev = get(arrAtom)
      set(arrAtom as WritableAtom<Item[], Item[]>, [
        ...prev.slice(0, index),
        ...prev.slice(index + 1),
      ])
    }
  }
  const splittedAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
  return splittedAtom
}

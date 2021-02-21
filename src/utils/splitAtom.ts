import { atom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { Getter, Setter, SetStateAction } from '../core/types'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export function splitAtom<Item, Key>(
  arrAtom: Atom<Item[]> & { write: undefined },
  keyExtractor?: (item: Item) => Key
): Atom<Atom<Item>[]>

export function splitAtom<Item, Key>(
  arrAtom: WritableAtom<Item[], Item[]>,
  keyExtractor?: (item: Item) => Key
): WritableAtom<PrimitiveAtom<Item>[], PrimitiveAtom<Item>>

export function splitAtom<Item, Key>(
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
    get(arrAtom).forEach((item, index) => {
      const key = keyExtractor
        ? keyExtractor(item)
        : ((index as unknown) as Key)
      if (indexCache.get(key) !== index) {
        indexCache.set(key, index)
      }
      const cachedAtom = atomCache.get(key)
      if (cachedAtom) {
        nextSplitted[index] = cachedAtom
        return
      }
      const read = (get: Getter) => get(arrAtom)[indexCache.get(key) as number]
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        const index = indexCache.get(key) as number
        const prev = get(arrAtom)
        const nextItem = isFunction(update) ? update(prev[index]) : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...prev.slice(0, index),
          nextItem,
          ...prev.slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      atomCache.set(key, itemAtom)
      atomToKey.set(itemAtom, key)
      nextSplitted[index] = itemAtom
    })
    if (
      prevSplitted &&
      prevSplitted.length === nextSplitted.length &&
      prevSplitted.every((x, i) => x === nextSplitted[i])
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

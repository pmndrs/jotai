import { atom } from 'jotai'
import type {
  Atom,
  WritableAtom,
  PrimitiveAtom,
  Getter,
  Setter,
  SetStateAction,
} from 'jotai'

import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const splitAtomCache = new WeakMap()

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

const isFunction = <T>(x: T): x is T & Function => typeof x === 'function'

export function splitAtom<Item, Key>(
  arrAtom: WritableAtom<Item[], Item[]>,
  keyExtractor?: (item: Item) => Key
): WritableAtom<PrimitiveAtom<Item>[], PrimitiveAtom<Item>>

export function splitAtom<Item, Key>(
  arrAtom: Atom<Item[]>,
  keyExtractor?: (item: Item) => Key
): Atom<Atom<Item>[]>

export function splitAtom<Item, Key>(
  arrAtom: WritableAtom<Item[], Item[]> | Atom<Item[]>,
  keyExtractor?: (item: Item) => Key
) {
  const deps: object[] = keyExtractor ? [arrAtom, keyExtractor] : [arrAtom]
  const cachedAtom = getWeakCacheItem(splitAtomCache, deps)
  if (cachedAtom) {
    return cachedAtom
  }
  type ItemAtom = PrimitiveAtom<Item> | Atom<Item>
  let savedArr: Item[] | undefined
  let savedAtomList: ItemAtom[] | undefined
  let savedKeyList: Key[] | undefined
  const keyToAtom = (key: Key) => {
    const index = savedKeyList?.indexOf(key)
    if (index === undefined || index === -1) {
      return undefined
    }
    return savedAtomList?.[index]
  }
  const updateAtomList = (currentArr: Item[]) => {
    if (savedArr === currentArr) {
      return
    }
    const currentAtomList: Atom<Item>[] = []
    const currentKeyList: Key[] = []
    currentArr.forEach((item, index) => {
      const key = keyExtractor ? keyExtractor(item) : (index as unknown as Key)
      currentKeyList[index] = key
      const cachedAtom = keyToAtom(key)
      if (cachedAtom) {
        currentAtomList[index] = cachedAtom
        return
      }
      const read = (get: Getter) => {
        updateAtomList(get(arrAtom))
        const index = savedKeyList?.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        return (savedArr as Item[])[index]
      }
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        updateAtomList(get(arrAtom))
        const index = savedKeyList?.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        const currentItem = isFunction(update)
          ? update((savedArr as Item[])[index])
          : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...(savedArr as Item[]).slice(0, index),
          currentItem,
          ...(savedArr as Item[]).slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      itemAtom.scope = arrAtom.scope
      currentAtomList[index] = itemAtom
    })
    savedArr = currentArr
    savedKeyList = currentKeyList
    if (
      !savedAtomList ||
      savedAtomList.length !== currentAtomList.length ||
      savedAtomList.some((x, i) => x !== currentAtomList[i])
    ) {
      savedAtomList = currentAtomList
    }
  }
  const read = (get: Getter) => {
    updateAtomList(get(arrAtom))
    return savedAtomList as ItemAtom[]
  }
  const write = (get: Getter, set: Setter, atomToRemove: ItemAtom) => {
    const index = get(splittedAtom).indexOf(atomToRemove)
    if (index >= 0) {
      const prev = get(arrAtom)
      set(arrAtom as WritableAtom<Item[], Item[]>, [
        ...prev.slice(0, index),
        ...prev.slice(index + 1),
      ])
    }
  }
  const splittedAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
  splittedAtom.scope = arrAtom.scope
  setWeakCacheItem(splitAtomCache, deps, splittedAtom)
  return splittedAtom
}

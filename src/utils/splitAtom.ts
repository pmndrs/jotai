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
  let lastAtomList: ItemAtom[] | undefined
  let lastKeyList: Key[] | undefined
  const keyToAtom = (key: Key) => {
    const index = lastKeyList?.indexOf(key)
    if (index === undefined || index === -1) {
      return undefined
    }
    return lastAtomList?.[index]
  }
  const read = (get: Getter) => {
    const currentAtomList: Atom<Item>[] = []
    const currentKeyList: Key[] = []
    const currentArr = get(arrAtom)
    currentArr.forEach((item, index) => {
      const key = keyExtractor ? keyExtractor(item) : (index as unknown as Key)
      currentKeyList[index] = key
      const cachedAtom = keyToAtom(key)
      if (cachedAtom) {
        currentAtomList[index] = cachedAtom
        return
      }
      const read = (_get: Getter) => {
        const index = currentKeyList.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        return currentArr[index]
      }
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        const index = currentKeyList.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        if (currentArr !== get(arrAtom)) {
          throw new Error('arrary already modified')
        }
        const nextItem = isFunction(update) ? update(currentArr[index]) : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...currentArr.slice(0, index),
          nextItem,
          ...currentArr.slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      itemAtom.scope = arrAtom.scope
      currentAtomList[index] = itemAtom
    })
    if (
      lastAtomList &&
      lastAtomList.length === currentAtomList.length &&
      lastAtomList.every((x, i) => x === currentAtomList[i])
    ) {
      return lastAtomList
    }
    lastKeyList = currentKeyList
    return (lastAtomList = currentAtomList)
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

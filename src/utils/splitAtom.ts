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
  let savedAtomList: ItemAtom[] | undefined
  let savedKeyList: Key[] | undefined
  const keyToAtom = (key: Key) => {
    const index = savedKeyList?.indexOf(key)
    if (index === undefined || index === -1) {
      return undefined
    }
    return savedAtomList?.[index]
  }
  const read = (get: Getter) => {
    const currentArr = get(arrAtom)
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
        const latestArr = get(arrAtom)
        const index = (
          latestArr === currentArr ? currentKeyList : savedKeyList
        )?.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        return latestArr[index]
      }
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        const latestArr = get(arrAtom)
        const index = (
          latestArr === currentArr ? currentKeyList : savedKeyList
        )?.indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        const currentItem = isFunction(update)
          ? update(latestArr[index])
          : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...latestArr.slice(0, index),
          currentItem,
          ...latestArr.slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      itemAtom.scope = arrAtom.scope
      currentAtomList[index] = itemAtom
    })
    savedKeyList = currentKeyList
    if (
      savedAtomList &&
      savedAtomList.length === currentAtomList.length &&
      savedAtomList.every((x, i) => x === currentAtomList[i])
    ) {
      return savedAtomList
    }
    return (savedAtomList = currentAtomList)
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

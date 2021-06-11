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
  type AtomList = ItemAtom[] // index to atom mapping
  type KeyList = Key[] // index to key mapping
  const mappingAtom = atom<[AtomList, KeyList] | []>([])
  const read = (get: Getter) => {
    let currentAtomList: Atom<Item>[] = []
    let currentKeyList: Key[] = []
    const initMappingAtom = atom(
      (get) => get(mappingAtom),
      (_get, set) => {
        set(mappingAtom, (prev) => {
          if (prev[0] === currentAtomList && prev[1] === currentKeyList) {
            return prev
          }
          return [currentAtomList, currentKeyList]
        })
      }
    )
    let mounted = false
    initMappingAtom.onMount = (init) => {
      init()
      mounted = true
    }
    const [lastAtomList, lastKeyList] = get(initMappingAtom)
    const keyToAtom = (key: Key) => {
      const [lastAtomList, lastKeyList] = get(mappingAtom)
      const index = lastKeyList?.indexOf(key)
      if (index === undefined || index === -1) {
        return undefined
      }
      return lastAtomList?.[index]
    }
    get(arrAtom).forEach((item, index) => {
      const key = keyExtractor ? keyExtractor(item) : (index as unknown as Key)
      currentKeyList[index] = key
      const cachedAtom = keyToAtom(key)
      if (cachedAtom) {
        currentAtomList[index] = cachedAtom
        return
      }
      const read = (get: Getter) => {
        const [, lastKeyList] = get(mappingAtom)
        const index = (
          mounted ? (lastKeyList as KeyList) : currentKeyList
        ).indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        return get(arrAtom)[index]
      }
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        const [, lastKeyList] = get(mappingAtom)
        const index = (
          mounted ? (lastKeyList as KeyList) : currentKeyList
        ).indexOf(key)
        if (index === undefined || index === -1) {
          throw new Error('index not found')
        }
        const prev = get(arrAtom)
        const nextItem = isFunction(update) ? update(prev[index]) : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...prev.slice(0, index),
          nextItem,
          ...prev.slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      itemAtom.scope = arrAtom.scope
      currentAtomList[index] = itemAtom
    })
    if (
      lastAtomList &&
      lastKeyList &&
      lastAtomList.length === currentAtomList.length &&
      lastAtomList.every((x, i) => x === currentAtomList[i])
    ) {
      currentAtomList = lastAtomList
      currentKeyList = lastKeyList
      return lastAtomList
    }
    return currentAtomList
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

import { atom } from 'jotai'
import type {
  Atom,
  Getter,
  PrimitiveAtom,
  SetStateAction,
  Setter,
  WritableAtom,
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
  const refAtom = atom(
    () =>
      ({} as {
        atomList?: ItemAtom[]
        keyList?: Key[]
      })
  )
  const read = (get: Getter) => {
    const ref = get(refAtom)
    let nextAtomList: Atom<Item>[] = []
    let nextKeyList: Key[] = []
    get(arrAtom).forEach((item, index) => {
      const key = keyExtractor ? keyExtractor(item) : (index as unknown as Key)
      nextKeyList[index] = key
      const cachedAtom = ref.atomList?.[ref.keyList?.indexOf(key) ?? -1]
      if (cachedAtom) {
        nextAtomList[index] = cachedAtom
        return
      }
      const read = (get: Getter) => {
        const index = ref.keyList?.indexOf(key) ?? -1
        if (
          index === -1 &&
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn(
            'splitAtom: array index out of bounds, returning undefined',
            atom
          )
        }
        return get(arrAtom)[index] as Item
      }
      const write = (
        get: Getter,
        set: Setter,
        update: SetStateAction<Item>
      ) => {
        const index = ref.keyList?.indexOf(key) ?? -1
        if (index === -1) {
          throw new Error('splitAtom: array index not found')
        }
        const prev = get(arrAtom)
        const nextItem = isFunction(update)
          ? update(prev[index] as Item)
          : update
        set(arrAtom as WritableAtom<Item[], Item[]>, [
          ...prev.slice(0, index),
          nextItem,
          ...prev.slice(index + 1),
        ])
      }
      const itemAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      nextAtomList[index] = itemAtom
    })
    ref.keyList = nextKeyList
    if (
      ref.atomList &&
      ref.atomList.length === nextAtomList.length &&
      ref.atomList.every((x, i) => x === nextAtomList[i])
    ) {
      return ref.atomList
    }
    return (ref.atomList = nextAtomList)
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
  setWeakCacheItem(splitAtomCache, deps, splittedAtom)
  return splittedAtom
}

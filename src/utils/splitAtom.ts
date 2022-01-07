import { atom } from 'jotai'
import type {
  Atom,
  Getter,
  PrimitiveAtom,
  SetStateAction,
  Setter,
  WritableAtom,
} from 'jotai'
import { createMemoizeAtom } from './weakCache'

const memoizeAtom = createMemoizeAtom()

const isWritable = <Value, Update, Result extends void | Promise<void>>(
  atom: Atom<Value> | WritableAtom<Value, Update, Result>
): atom is WritableAtom<Value, Update, Result> =>
  !!(atom as WritableAtom<Value, Update, Result>).write

const isFunction = <T>(x: T): x is T & ((...args: any[]) => any) =>
  typeof x === 'function'

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
  return memoizeAtom(
    () => {
      type ItemAtom = PrimitiveAtom<Item> | Atom<Item>
      type Mapping = {
        atomList: ItemAtom[]
        keyList: Key[]
      }
      const mappingCache = new WeakMap<Item[], Mapping>()
      const getMapping = (arr: Item[], prev?: Item[]) => {
        let mapping = mappingCache.get(arr)
        if (mapping) {
          return mapping
        }
        const prevMapping = prev && mappingCache.get(prev)
        const atomList: Atom<Item>[] = []
        const keyList: Key[] = []
        arr.forEach((item, index) => {
          const key = keyExtractor
            ? keyExtractor(item)
            : (index as unknown as Key)
          keyList[index] = key
          const cachedAtom =
            prevMapping &&
            prevMapping.atomList[prevMapping.keyList.indexOf(key) ?? -1]
          if (cachedAtom) {
            atomList[index] = cachedAtom
            return
          }
          const read = (get: Getter) => {
            const ref = get(refAtom)
            const arr = get(arrAtom)
            const mapping = getMapping(arr, ref.prev)
            const index = mapping.keyList.indexOf(key) ?? -1
            if (index < 0 || index >= arr.length) {
              throw new Error('splitAtom: index out of bounds for read')
            }
            return arr[index] as Item
          }
          const write = (
            get: Getter,
            set: Setter,
            update: SetStateAction<Item>
          ) => {
            const ref = get(refAtom)
            const arr = get(arrAtom)
            const mapping = getMapping(arr, ref.prev)
            const index = mapping.keyList.indexOf(key) ?? -1
            if (index < 0 || index >= arr.length) {
              throw new Error('splitAtom: index out of bounds for write')
            }
            const nextItem = isFunction(update)
              ? update(arr[index] as Item)
              : update
            set(arrAtom as WritableAtom<Item[], Item[]>, [
              ...arr.slice(0, index),
              nextItem,
              ...arr.slice(index + 1),
            ])
          }
          atomList[index] = isWritable(arrAtom) ? atom(read, write) : atom(read)
        })
        if (
          prevMapping &&
          prevMapping.keyList.length === keyList.length &&
          prevMapping.keyList.every((x, i) => x === keyList[i])
        ) {
          // not changed
          mapping = prevMapping
        } else {
          mapping = { atomList, keyList }
        }
        mappingCache.set(arr, mapping)
        return mapping
      }
      // TODO we should revisit this for a better solution than refAtom
      const refAtom = atom(() => ({} as { prev?: Item[] }))
      const read = (get: Getter) => {
        const ref = get(refAtom)
        const arr = get(arrAtom)
        const mapping = getMapping(arr, ref.prev)
        ref.prev = arr
        return mapping.atomList
      }
      const write = (get: Getter, set: Setter, atomToRemove: ItemAtom) => {
        const index = get(splittedAtom).indexOf(atomToRemove)
        if (index >= 0) {
          const arr = get(arrAtom)
          set(arrAtom as WritableAtom<Item[], Item[]>, [
            ...arr.slice(0, index),
            ...arr.slice(index + 1),
          ])
        }
      }
      const splittedAtom = isWritable(arrAtom) ? atom(read, write) : atom(read)
      return splittedAtom
    },
    keyExtractor ? [arrAtom, keyExtractor] : [arrAtom]
  )
}

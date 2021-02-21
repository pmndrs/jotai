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
  let currentAtomList: ItemAtom[] | undefined
  let currentKeyList: Key[] | undefined
  const keyToAtom = (key: Key) => {
    const index = currentKeyList?.indexOf(key)
    if (index === undefined || index === -1) {
      return undefined
    }
    return currentAtomList?.[index]
  }
  const read = (get: Getter) => {
    let nextAtomList: Atom<Item>[] = []
    let nextKeyList: Key[] = []
    get(arrAtom).forEach((item, index) => {
      const key = keyExtractor
        ? keyExtractor(item)
        : ((index as unknown) as Key)
      nextKeyList[index] = key
      const cachedAtom = keyToAtom(key)
      if (cachedAtom) {
        nextAtomList[index] = cachedAtom
        return
      }
      const read = (get: Getter) => {
        const index = currentKeyList?.indexOf(key)
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
        const index = currentKeyList?.indexOf(key)
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
      nextAtomList[index] = itemAtom
    })
    currentKeyList = nextKeyList
    if (
      currentAtomList &&
      currentAtomList.length === nextAtomList.length &&
      currentAtomList.every((x, i) => x === nextAtomList[i])
    ) {
      return currentAtomList
    }
    return (currentAtomList = nextAtomList)
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
  return splittedAtom
}

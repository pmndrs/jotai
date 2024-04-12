import { atom } from '../../vanilla.ts'
import type {
  Atom,
  Getter,
  PrimitiveAtom,
  SetStateAction,
  Setter,
  WritableAtom,
} from '../../vanilla.ts'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo2 = <T>(create: () => T, dep1: object, dep2: object): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  return getCached(create, cache2, dep2)
}
const cacheKeyForEmptyKeyExtractor = {}

const isWritable = <Value, Args extends unknown[], Result>(
  atom: Atom<Value> | WritableAtom<Value, Args, Result>,
): atom is WritableAtom<Value, Args, Result> =>
  !!(atom as WritableAtom<Value, Args, Result>).write

const isFunction = <T>(x: T): x is T & ((...args: never[]) => unknown) =>
  typeof x === 'function'

type SplitAtomAction<Item> =
  | { type: 'remove'; atom: PrimitiveAtom<Item> }
  | {
      type: 'insert'
      value: Item
      before?: PrimitiveAtom<Item>
    }
  | {
      type: 'move'
      atom: PrimitiveAtom<Item>
      before?: PrimitiveAtom<Item>
    }
  | {
      type: 'bulk'
      atoms: PrimitiveAtom<Item>[]
    }

export function splitAtom<Item, Key>(
  arrAtom: WritableAtom<Item[], [Item[]], void>,
  keyExtractor?: (item: Item) => Key,
): WritableAtom<PrimitiveAtom<Item>[], [SplitAtomAction<Item>], void>

export function splitAtom<Item, Key>(
  arrAtom: Atom<Item[]>,
  keyExtractor?: (item: Item) => Key,
): Atom<Atom<Item>[]>

export function splitAtom<Item, Key>(
  arrAtom: WritableAtom<Item[], [Item[]], void> | Atom<Item[]>,
  keyExtractor?: (item: Item) => Key,
) {
  return memo2(
    () => {
      type ItemAtom = PrimitiveAtom<Item> | Atom<Item>
      type Mapping = {
        arr: Item[]
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
            prevMapping.atomList[prevMapping.keyList.indexOf(key)]
          if (cachedAtom) {
            atomList[index] = cachedAtom
            return
          }
          const read = (get: Getter) => {
            const prev = get(mappingAtom) as Mapping | undefined
            const currArr = get(arrAtom)
            const mapping = getMapping(currArr, prev?.arr)
            const index = mapping.keyList.indexOf(key)
            if (index < 0 || index >= currArr.length) {
              // returning a stale value to avoid errors for use cases such as react-spring
              const prevItem = arr[getMapping(arr).keyList.indexOf(key)]
              if (prevItem) {
                return prevItem
              }
              throw new Error('splitAtom: index out of bounds for read')
            }
            return currArr[index]!
          }
          const write = (
            get: Getter,
            set: Setter,
            update: SetStateAction<Item>,
          ) => {
            const prev = get(mappingAtom) as Mapping | undefined
            const arr = get(arrAtom)
            const mapping = getMapping(arr, prev?.arr)
            const index = mapping.keyList.indexOf(key)
            if (index < 0 || index >= arr.length) {
              throw new Error('splitAtom: index out of bounds for write')
            }
            const nextItem = isFunction(update)
              ? (update as (prev: Item) => Item)(arr[index]!)
              : update
            if (!Object.is(arr[index], nextItem)) {
              set(arrAtom as WritableAtom<Item[], [Item[]], void>, [
                ...arr.slice(0, index),
                nextItem,
                ...arr.slice(index + 1),
              ])
            }
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
          mapping = { arr, atomList, keyList }
        }
        mappingCache.set(arr, mapping)
        return mapping
      }
      const mappingAtom: Atom<Mapping> & {
        init?: undefined
      } = atom((get) => {
        const prev = get(mappingAtom) as Mapping | undefined
        const arr = get(arrAtom)
        const mapping = getMapping(arr, prev?.arr)
        return mapping
      })

      if (import.meta.env?.MODE !== 'production') {
        mappingAtom.debugPrivate = true
      }

      // HACK to read mapping atom before initialization
      mappingAtom.init = undefined
      const splittedAtom = isWritable(arrAtom)
        ? atom(
            (get) => get(mappingAtom).atomList,
            (get, set, action: SplitAtomAction<Item>) => {
              switch (action.type) {
                case 'remove': {
                  const index = get(splittedAtom).indexOf(action.atom)
                  if (index >= 0) {
                    const arr = get(arrAtom)
                    set(arrAtom as WritableAtom<Item[], [Item[]], void>, [
                      ...arr.slice(0, index),
                      ...arr.slice(index + 1),
                    ])
                  }
                  break
                }
                case 'insert': {
                  const index = action.before
                    ? get(splittedAtom).indexOf(action.before)
                    : get(splittedAtom).length
                  if (index >= 0) {
                    const arr = get(arrAtom)
                    set(arrAtom as WritableAtom<Item[], [Item[]], void>, [
                      ...arr.slice(0, index),
                      action.value,
                      ...arr.slice(index),
                    ])
                  }
                  break
                }
                case 'move': {
                  const index1 = get(splittedAtom).indexOf(action.atom)
                  const index2 = action.before
                    ? get(splittedAtom).indexOf(action.before)
                    : get(splittedAtom).length
                  if (index1 >= 0 && index2 >= 0) {
                    const arr = get(arrAtom)
                    if (index1 < index2) {
                      set(arrAtom as WritableAtom<Item[], [Item[]], void>, [
                        ...arr.slice(0, index1),
                        ...arr.slice(index1 + 1, index2),
                        arr[index1]!,
                        ...arr.slice(index2),
                      ])
                    } else {
                      set(arrAtom as WritableAtom<Item[], [Item[]], void>, [
                        ...arr.slice(0, index2),
                        arr[index1]!,
                        ...arr.slice(index2, index1),
                        ...arr.slice(index1 + 1),
                      ])
                    }
                  }
                  break
                }
                case 'bulk': {
                  set(
                    arrAtom,
                    action.atoms.map((atom) => get(atom)),
                  )
                  break
                }
              }
            },
          )
        : atom((get) => get(mappingAtom).atomList) // read-only atom
      return splittedAtom
    },
    arrAtom,
    keyExtractor || cacheKeyForEmptyKeyExtractor,
  )
}

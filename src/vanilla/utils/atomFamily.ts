import { type Atom } from '../../vanilla.ts'
import {
  INTERNAL_getBuildingBlocksRev2 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev2 as INTERNAL_initializeStoreHooks,
  type INTERNAL_Store as Store,
} from '../internals.ts'

/**
 * in milliseconds
 */
type CreatedAt = number
type ShouldRemove<Param> = (createdAt: CreatedAt, param: Param) => boolean
type Cleanup = () => void
type Callback<Param, AtomType> = (event: {
  type: 'CREATE' | 'REMOVE'
  param: Param
  atom: AtomType
}) => void

export interface AtomFamily<Param, AtomType> {
  (param: Param): AtomType
  getParams(): Iterable<Param>
  remove(param: Param): void
  setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void
  /**
   * fires when a atom is created or removed
   * This API is for advanced use cases, and can change without notice.
   */
  unstable_listen(callback: Callback<Param, AtomType>): Cleanup
}

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean,
): AtomFamily<Param, AtomType>

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean,
) {
  let shouldRemove: ShouldRemove<Param> | null = null
  const atoms: Map<Param, [AtomType, CreatedAt]> = new Map()
  const atomsParams = new WeakMap<AtomType, Param>()
  const listeners = new Set<Callback<Param, AtomType>>()
  const fullyUnmounted = new Set<AtomType>()
  const markedForRemoval = new WeakSet<AtomType>()
  const atomStores = new WeakMap<AtomType, [WeakSet<Store>, number]>()

  const createAtom = (param: Param) => {
    let item: [AtomType, CreatedAt] | undefined
    if (areEqual === undefined) {
      item = atoms.get(param)
    } else {
      // Custom comparator, iterate over all elements
      for (const [key, value] of atoms) {
        if (areEqual(key, param)) {
          item = value
          break
        }
      }
    }

    if (item !== undefined) {
      if (shouldRemove?.(item[1], param)) {
        createAtom.remove(param)
      } else {
        return item[0]
      }
    }

    const newAtom = initializeAtom(param)

    let atomInitFunction = newAtom.unstable_onInit

    Object.defineProperty(newAtom, 'unstable_onInit', {
      get() {
        return (store: Store) => {
          atomInitFunction?.(store)
          atomFamilyInit(store)
        }
      },
      set(initFn: AtomType['unstable_onInit']) {
        atomInitFunction = initFn
      },
      configurable: false,
      enumerable: true,
    })

    const atomFamilyInit = (store: Store) => {
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      const storeHooks = INTERNAL_initializeStoreHooks(buildingBlocks[6])

      storeHooks.m.add(newAtom, () => {
        let storeData = atomStores.get(newAtom)
        if (!storeData) {
          storeData = [new WeakSet(), 0]
          atomStores.set(newAtom, storeData)
        }
        const [storeSet] = storeData
        if (!storeSet.has(store)) {
          storeSet.add(store)
          storeData[1] += 1
        }
        fullyUnmounted.delete(newAtom)
      })

      storeHooks.u.add(newAtom, () => {
        const storeData = atomStores.get(newAtom)
        if (storeData) {
          const [storeSet] = storeData
          if (storeSet.has(store)) {
            storeSet.delete(store)
            storeData[1] -= 1
            if (storeData[1] === 0) {
              fullyUnmounted.add(newAtom)
            }
          }
        }
      })

      storeHooks.f.add(flushFullyUnmounted)
    }

    atoms.set(param, [newAtom, Date.now()])
    atomsParams.set(newAtom, param)
    notifyListeners('CREATE', param, newAtom)
    return newAtom
  }

  const flushFullyUnmounted = () => {
    for (const atom of fullyUnmounted) {
      const storeData = atomStores.get(atom)
      const count = storeData?.[1] ?? 0
      if (markedForRemoval.has(atom) && count === 0) {
        fullyUnmounted.delete(atom)
        const param = atomsParams.get(atom)
        if (param === undefined) continue
        atoms.delete(param)
        notifyListeners('REMOVE', param, atom)
      }
    }
  }

  const markForRemoval = (atom: AtomType) => {
    markedForRemoval.add(atom)
    const storeData = atomStores.get(atom)
    const count = storeData?.[1] ?? 0
    if (count === 0) {
      fullyUnmounted.add(atom)
    }
  }

  const notifyListeners = (
    type: 'CREATE' | 'REMOVE',
    param: Param,
    atom: AtomType,
  ) => {
    for (const listener of listeners) {
      listener({ type, param, atom })
    }
  }

  createAtom.unstable_listen = (callback: Callback<Param, AtomType>) => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }

  createAtom.getParams = () => atoms.keys()

  createAtom.remove = (param: Param) => {
    if (areEqual === undefined) {
      if (!atoms.has(param)) return
      const [atom] = atoms.get(param)!
      markForRemoval(atom)
    } else {
      for (const [key, [atom]] of atoms) {
        if (areEqual(key, param)) {
          markForRemoval(atom)
          break
        }
      }
    }
    flushFullyUnmounted()
  }

  createAtom.setShouldRemove = (fn: ShouldRemove<Param> | null) => {
    shouldRemove = fn
    if (!shouldRemove) return
    for (const [key, [atom, createdAt]] of atoms) {
      if (shouldRemove(createdAt, key)) {
        markForRemoval(atom)
      }
    }
    flushFullyUnmounted()
  }
  return createAtom
}

import type { Atom, WritableAtom } from './atom.ts'
import {
  INTERNAL_buildStoreRev1 as INTERNAL_buildStore,
  INTERNAL_initializeStoreHooks,
} from './internals.ts'
import type { INTERNAL_AtomState, INTERNAL_Store } from './internals.ts'

// TODO: rename this to `Store` in the near future
export type INTERNAL_PrdStore = INTERNAL_Store

// For debugging purpose only
// This will be removed in the near future
export type INTERNAL_DevStoreRev4 = {
  dev4_get_internal_weak_map: () => {
    get: (atom: Atom<unknown>) => INTERNAL_AtomState | undefined
  }
  dev4_get_mounted_atoms: () => Set<Atom<unknown>>
  dev4_restore_atoms: (
    values: Iterable<readonly [Atom<unknown>, unknown]>,
  ) => void
}

const createDevStoreRev4 = (): INTERNAL_PrdStore & INTERNAL_DevStoreRev4 => {
  let inRestoreAtom = 0
  const storeHooks = INTERNAL_initializeStoreHooks({})
  const atomStateMap = new WeakMap()
  const mountedAtoms = new WeakMap()
  const store = INTERNAL_buildStore(
    atomStateMap,
    mountedAtoms,
    undefined,
    undefined,
    undefined,
    undefined,
    storeHooks,
    undefined,
    (atom, get, set, ...args) => {
      if (inRestoreAtom) {
        return set(atom, ...args)
      }
      return atom.write(get, set, ...args)
    },
  )
  const debugMountedAtoms = new Set<Atom<unknown>>()
  storeHooks.m.add(undefined, (atom) => {
    debugMountedAtoms.add(atom)
    const atomState = atomStateMap.get(atom)
    // For DevStoreRev4 compatibility
    ;(atomState as any).m = mountedAtoms.get(atom)
  })
  storeHooks.u.add(undefined, (atom) => {
    debugMountedAtoms.delete(atom)
    const atomState = atomStateMap.get(atom)
    // For DevStoreRev4 compatibility
    delete (atomState as any).m
  })
  const devStore: INTERNAL_DevStoreRev4 = {
    // store dev methods (these are tentative and subject to change without notice)
    dev4_get_internal_weak_map: () => atomStateMap,
    dev4_get_mounted_atoms: () => debugMountedAtoms,
    dev4_restore_atoms: (values) => {
      const restoreAtom: WritableAtom<null, [], void> = {
        read: () => null,
        write: (_get, set) => {
          ++inRestoreAtom
          try {
            for (const [atom, value] of values) {
              if ('init' in atom) {
                set(atom as never, value)
              }
            }
          } finally {
            --inRestoreAtom
          }
        },
      }
      store.set(restoreAtom)
    },
  }
  return Object.assign(store, devStore)
}

type PrdOrDevStore =
  | INTERNAL_PrdStore
  | (INTERNAL_PrdStore & INTERNAL_DevStoreRev4)

export const createStore = (): PrdOrDevStore => {
  if (import.meta.env?.MODE !== 'production') {
    return createDevStoreRev4()
  }
  const store = INTERNAL_buildStore()
  return store
}

let defaultStore: PrdOrDevStore | undefined

export const getDefaultStore = (): PrdOrDevStore => {
  if (!defaultStore) {
    defaultStore = createStore()
    if (import.meta.env?.MODE !== 'production') {
      ;(globalThis as any).__JOTAI_DEFAULT_STORE__ ||= defaultStore
      if ((globalThis as any).__JOTAI_DEFAULT_STORE__ !== defaultStore) {
        console.warn(
          'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
        )
      }
    }
  }
  return defaultStore
}

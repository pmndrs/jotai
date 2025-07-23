import type { Atom, WritableAtom } from './atom.ts'
import {
  INTERNAL_createAtomInterceptorsRev2 as INTERNAL_createAtomInterceptors,
  INTERNAL_createBuildingBlocksRev2 as INTERNAL_createBuildingBlocks,
  INTERNAL_createStoreStateRev2 as INTERNAL_createStoreState,
  INTERNAL_initializeStoreHooksRev2 as INTERNAL_initializeStoreHooks,
  INTERNAL_returnAtomValue,
} from './internals.ts'
import type { INTERNAL_AtomState, INTERNAL_Store } from './internals.ts'

// TODO: rename this to `Store` in the near future
export type INTERNAL_PrdStore = INTERNAL_Store

// For debugging purpose only
// This will be removed in the near future
/* @deprecated Deprecated: Use devstore from the devtools library */
export type INTERNAL_DevStoreRev4 = {
  dev4_get_internal_weak_map: () => {
    get: (atom: Atom<unknown>) => INTERNAL_AtomState | undefined
  }
  dev4_get_mounted_atoms: () => Set<Atom<unknown>>
  dev4_restore_atoms: (
    values: Iterable<readonly [Atom<unknown>, unknown]>,
  ) => void
}

/* @deprecated Deprecated: Use devstore from the devtools library */
const createDevStoreRev4 = (): INTERNAL_PrdStore & INTERNAL_DevStoreRev4 => {
  let inRestoreAtom = 0
  const storeHooks = INTERNAL_initializeStoreHooks({})
  const atomStateMap = new WeakMap()
  const mountedAtoms = new WeakMap()
  const storeState = INTERNAL_createStoreState(
    atomStateMap,
    mountedAtoms,
    undefined,
    undefined,
    undefined,
    undefined,
    storeHooks,
  )
  const atomInterceptors = INTERNAL_createAtomInterceptors(
    undefined,
    (atom, get, set, ...args) => {
      if (inRestoreAtom) {
        return set(atom, ...args)
      }
      return atom.write(get, set, ...args)
    },
  )
  const buildingBlocks = INTERNAL_createBuildingBlocks(
    () => store,
    storeState,
    atomInterceptors,
  )
  const [
    _ensureAtomState,
    flushCallbacks,
    recomputeInvalidatedAtoms,
    readAtomState,
    _invalidateDependents,
    writeAtomState,
    _mountDependencies,
    mountAtom,
    unmountAtom,
  ] = buildingBlocks
  const store: INTERNAL_Store = {
    get: (atom) => INTERNAL_returnAtomValue(readAtomState(atom)),
    set: (atom, ...args) => {
      try {
        return writeAtomState(atom, ...args)
      } finally {
        recomputeInvalidatedAtoms()
        flushCallbacks()
      }
    },
    sub: (atom, listener) => {
      const mounted = mountAtom(atom)
      const listeners = mounted.l
      listeners.add(listener)
      flushCallbacks()
      return () => {
        listeners.delete(listener)
        unmountAtom(atom)
        flushCallbacks()
      }
    },
  }
  Object.assign(store, {
    _storeStateRev2: storeState,
    _atomInterceptorsRev2: atomInterceptors,
    _buildingBlocksRev2: buildingBlocks,
  })
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
    dev4_get_internal_weak_map: () => {
      console.log('Deprecated: Use devstore from the devtools library')
      return atomStateMap
    },
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

let overiddenCreateStore: typeof createStore | undefined

export function INTERNAL_overrideCreateStore(
  fn: (prev: typeof createStore | undefined) => typeof createStore,
): void {
  overiddenCreateStore = fn(overiddenCreateStore)
}

export function createStore(): PrdOrDevStore {
  if (overiddenCreateStore) {
    return overiddenCreateStore()
  }
  if (import.meta.env?.MODE !== 'production') {
    return createDevStoreRev4()
  }
  const storeState = INTERNAL_createStoreState()
  const atomInterceptors = INTERNAL_createAtomInterceptors()
  const buildingBlocks = INTERNAL_createBuildingBlocks(
    () => store,
    storeState,
    atomInterceptors,
  )
  const [
    _ensureAtomState,
    flushCallbacks,
    recomputeInvalidatedAtoms,
    readAtomState,
    _invalidateDependents,
    writeAtomState,
    _mountDependencies,
    mountAtom,
    unmountAtom,
  ] = buildingBlocks
  const store: INTERNAL_Store = {
    get: (atom) => INTERNAL_returnAtomValue(readAtomState(atom)),
    set: (atom, ...args) => {
      try {
        return writeAtomState(atom, ...args)
      } finally {
        recomputeInvalidatedAtoms()
        flushCallbacks()
      }
    },
    sub: (atom, listener) => {
      const mounted = mountAtom(atom)
      const listeners = mounted.l
      listeners.add(listener)
      flushCallbacks()
      return () => {
        listeners.delete(listener)
        unmountAtom(atom)
        flushCallbacks()
      }
    },
  }
  Object.assign(store, {
    _storeStateRev2: storeState,
    _atomInterceptorsRev2: atomInterceptors,
    _buildingBlocksRev2: buildingBlocks,
  })
  return store
}

let defaultStore: PrdOrDevStore | undefined

export function getDefaultStore(): PrdOrDevStore {
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

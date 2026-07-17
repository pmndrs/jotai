import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai'
import type { Atom } from 'jotai'
import type {
  INTERNAL_AtomState,
  INTERNAL_AtomStateMap,
  INTERNAL_BuildingBlocks,
  INTERNAL_InvalidatedAtoms,
} from 'jotai/vanilla/internals'
import {
  INTERNAL_buildStoreRev4 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev4 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev4 as INTERNAL_initializeStoreHooks,
  INTERNAL_KEY_abortHandlersMap as KEY_abortHandlersMap,
  INTERNAL_KEY_abortPromise as KEY_abortPromise,
  INTERNAL_KEY_atomOnInit as KEY_atomOnInit,
  INTERNAL_KEY_atomOnMount as KEY_atomOnMount,
  INTERNAL_KEY_atomRead as KEY_atomRead,
  INTERNAL_KEY_atomStateMap as KEY_atomStateMap,
  INTERNAL_KEY_atomWrite as KEY_atomWrite,
  INTERNAL_KEY_changedAtoms as KEY_changedAtoms,
  INTERNAL_KEY_enhanceBuildingBlocks as KEY_enhanceBuildingBlocks,
  INTERNAL_KEY_ensureAtomState as KEY_ensureAtomState,
  INTERNAL_KEY_flushCallbacks as KEY_flushCallbacks,
  INTERNAL_KEY_invalidateDependents as KEY_invalidateDependents,
  INTERNAL_KEY_invalidatedAtoms as KEY_invalidatedAtoms,
  INTERNAL_KEY_mountAtom as KEY_mountAtom,
  INTERNAL_KEY_mountCallbacks as KEY_mountCallbacks,
  INTERNAL_KEY_mountDependencies as KEY_mountDependencies,
  INTERNAL_KEY_mountedMap as KEY_mountedMap,
  INTERNAL_KEY_readAtomState as KEY_readAtomState,
  INTERNAL_KEY_recomputeInvalidatedAtoms as KEY_recomputeInvalidatedAtoms,
  INTERNAL_KEY_registerAbortHandler as KEY_registerAbortHandler,
  INTERNAL_KEY_setAtomStateValueOrPromise as KEY_setAtomStateValueOrPromise,
  INTERNAL_KEY_storeEpochHolder as KEY_storeEpochHolder,
  INTERNAL_KEY_storeGet as KEY_storeGet,
  INTERNAL_KEY_storeHooks as KEY_storeHooks,
  INTERNAL_KEY_storeSet as KEY_storeSet,
  INTERNAL_KEY_storeSub as KEY_storeSub,
  INTERNAL_KEY_unmountAtom as KEY_unmountAtom,
  INTERNAL_KEY_unmountCallbacks as KEY_unmountCallbacks,
  INTERNAL_KEY_writeAtomState as KEY_writeAtomState,
} from 'jotai/vanilla/internals'

const buildingBlockKeys: (keyof INTERNAL_BuildingBlocks)[] = [
  KEY_atomStateMap,
  KEY_mountedMap,
  KEY_invalidatedAtoms,
  KEY_changedAtoms,
  KEY_mountCallbacks,
  KEY_unmountCallbacks,
  KEY_storeHooks,
  KEY_atomRead,
  KEY_atomWrite,
  KEY_atomOnInit,
  KEY_atomOnMount,
  KEY_ensureAtomState,
  KEY_flushCallbacks,
  KEY_recomputeInvalidatedAtoms,
  KEY_readAtomState,
  KEY_invalidateDependents,
  KEY_writeAtomState,
  KEY_mountDependencies,
  KEY_mountAtom,
  KEY_unmountAtom,
  KEY_setAtomStateValueOrPromise,
  KEY_storeGet,
  KEY_storeSet,
  KEY_storeSub,
  KEY_enhanceBuildingBlocks,
  KEY_abortHandlersMap,
  KEY_registerAbortHandler,
  KEY_abortPromise,
  KEY_storeEpochHolder,
]

describe('internals', () => {
  it('should return complete building blocks', () => {
    {
      const store = createStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(isBuildingBlocks(buildingBlocks)).toBe(true)
    }
    {
      const store = INTERNAL_buildStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(isBuildingBlocks(buildingBlocks)).toBe(true)
    }
  })

  it('should export distinct single-char key constants', () => {
    expect(buildingBlockKeys.every((key) => key.length === 1)).toBe(true)
    expect(new Set(buildingBlockKeys).size).toBe(buildingBlockKeys.length)
  })

  it('internals should not hold stale references', () => {
    const createMockAtomStateMap = () => {
      return {
        get: vi.fn(() => {
          return {
            d: new Map(),
            p: new Set(),
            n: 0,
            v: 0,
          } as INTERNAL_AtomState
        }),
        set: vi.fn(),
        has: vi.fn(() => true),
        delete: vi.fn(() => true),
      } as INTERNAL_AtomStateMap
    }
    const mockAtomStateMap1 = createMockAtomStateMap()
    const buildingBlocks1: Partial<INTERNAL_BuildingBlocks> = {
      [KEY_atomStateMap]: mockAtomStateMap1,
    }
    const store1 = INTERNAL_buildStore(buildingBlocks1)
    const buildingBlocks2 = { ...INTERNAL_getBuildingBlocks(store1) }
    const mockAtomStateMap2 = createMockAtomStateMap()
    buildingBlocks2[KEY_atomStateMap] = mockAtomStateMap2
    const store2 = INTERNAL_buildStore(buildingBlocks2)
    store2.get(atom(0))
    expect(mockAtomStateMap1.get).not.toHaveBeenCalled()
    expect(mockAtomStateMap2.get).toHaveBeenCalled()
  })

  it('should transform external building blocks differently from internal ones', () => {
    const didRun = {
      internal: vi.fn(),
      external: vi.fn(),
    }
    const bb0: Partial<INTERNAL_BuildingBlocks> = {}
    bb0[KEY_storeGet] = function storeGet1() {
      didRun.internal()
    } as INTERNAL_BuildingBlocks[typeof KEY_storeGet]
    let bbInternal: Readonly<INTERNAL_BuildingBlocks> | undefined
    function storeGet() {
      didRun.external()
    }
    bb0[KEY_enhanceBuildingBlocks] = (bbi) => {
      bbInternal = bbi
      return {
        ...bbi,
        [KEY_storeGet]:
          storeGet as INTERNAL_BuildingBlocks[typeof KEY_storeGet],
      }
    }
    const store1 = INTERNAL_buildStore(bb0)
    const bb1 = INTERNAL_getBuildingBlocks(store1)
    expect(isBuildingBlocks(bb1)).toBe(true)
    expect(isBuildingBlocks(bbInternal)).toBe(true)
    const store2 = INTERNAL_buildStore(bb1)
    const bb2 = INTERNAL_getBuildingBlocks(store2)
    expect(isBuildingBlocks(bb2)).toBe(true)
    expect(isBuildingBlocks(bbInternal)).toBe(true)
    expect(bb0[KEY_storeGet]).not.toBe(bb1[KEY_storeGet])
    expect(bb1[KEY_storeGet]).toBe(bb2[KEY_storeGet])
    store1.get(atom(0))
    expect(didRun.internal).toHaveBeenCalledTimes(1)
    expect(didRun.external).toHaveBeenCalledTimes(0)
    vi.clearAllMocks()
    store2.get(atom(0))
    expect(didRun.internal).toHaveBeenCalledTimes(0)
    expect(didRun.external).toHaveBeenCalledTimes(1)
  })

  it('each store.get causes full scan of atom dependencies when state unchanged (performance)', () => {
    const SIZE = 10_000
    const deps = Array.from({ length: SIZE }, () => atom(0))
    const derivedAtom = atom((get) => deps.map(get))
    const atomRead = vi.fn()
    // FIXME
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapRead = <A extends { read: (...args: any[]) => any }>(a: A) => {
      const { read } = a
      a.read = ((...args: Parameters<A['read']>): ReturnType<A['read']> => {
        atomRead(...args)
        return read.apply(a, args)
      }) as A['read']
    }
    ;[...deps, derivedAtom].forEach(wrapRead)
    const rawBlocks = INTERNAL_getBuildingBlocks(INTERNAL_buildStore())
    const ras = vi.fn(rawBlocks[KEY_readAtomState])
    const buildingBlocks = {
      ...rawBlocks,
      [KEY_readAtomState]:
        ras as INTERNAL_BuildingBlocks[typeof KEY_readAtomState],
    }
    const store = INTERNAL_buildStore(buildingBlocks)
    console.time('store.get')
    store.get(derivedAtom) // does a deep scan of atom dependencies
    console.timeEnd('store.get')
    expect(atomRead).toHaveBeenCalledTimes(SIZE + 1)
    expect(ras).toHaveBeenCalledTimes(SIZE + 1)
    atomRead.mockClear()
    ras.mockClear()
    console.time('store.get (cached)')
    store.get(derivedAtom)
    console.timeEnd('store.get (cached)')
    // Cached value: no atom read needed
    expect(atomRead).toHaveBeenCalledTimes(0)
    // readAtomState should be called once, not full scan
    expect(ras).toHaveBeenCalledTimes(1)
  })

  it('multiple unmounted derived atom caches stay valid after one mutation (performance)', () => {
    const SIZE = 1_000
    const baseAtom = atom(0)
    const deps1 = Array.from({ length: SIZE }, () =>
      atom((get) => get(baseAtom)),
    )
    const deps2 = Array.from({ length: SIZE }, () =>
      atom((get) => get(baseAtom)),
    )
    const derivedAtom1 = atom((get) => deps1.map(get))
    const derivedAtom2 = atom((get) => deps2.map(get))
    const atomRead = vi.fn()
    // FIXME
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapRead = <A extends { read: (...args: any[]) => any }>(a: A) => {
      const { read } = a
      a.read = ((...args: Parameters<A['read']>): ReturnType<A['read']> => {
        atomRead(...args)
        return read.apply(a, args)
      }) as A['read']
    }
    ;[baseAtom, ...deps1, ...deps2, derivedAtom1, derivedAtom2].forEach(
      wrapRead,
    )
    const rawBlocks = INTERNAL_getBuildingBlocks(INTERNAL_buildStore())
    const ras = vi.fn(rawBlocks[KEY_readAtomState])
    const buildingBlocks = {
      ...rawBlocks,
      [KEY_readAtomState]:
        ras as INTERNAL_BuildingBlocks[typeof KEY_readAtomState],
    }
    const store = INTERNAL_buildStore(buildingBlocks)

    store.get(derivedAtom1)
    store.get(derivedAtom2)
    atomRead.mockClear()
    ras.mockClear()

    store.set(baseAtom, 1)
    store.get(derivedAtom1)
    store.get(derivedAtom2)

    atomRead.mockClear()
    ras.mockClear()
    store.get(derivedAtom1)
    expect(atomRead).toHaveBeenCalledTimes(0)
    expect(ras).toHaveBeenCalledTimes(1)

    atomRead.mockClear()
    ras.mockClear()
    store.get(derivedAtom2)
    expect(atomRead).toHaveBeenCalledTimes(0)
    expect(ras).toHaveBeenCalledTimes(1)
  })

  it('invalidateDependents should not invalidate the same dependent twice via multiple paths', () => {
    const invalidatedAtoms = (() => {
      const map = new WeakMap()
      return {
        get: (key) => map.get(key),
        set: (key, value) => {
          const prev = map.get(key)
          if (prev === value) {
            throw new Error('duplicate invalidation')
          }
          map.set(key, value)
        },
        has: (key) => map.has(key),
        delete: (key) => map.delete(key),
      } as INTERNAL_InvalidatedAtoms
    })()

    const partialBuildingBlocks: Partial<INTERNAL_BuildingBlocks> = {
      [KEY_invalidatedAtoms]: invalidatedAtoms,
    }
    const store = INTERNAL_buildStore(partialBuildingBlocks)

    const baseAtom = atom(0)
    const midAtom1 = atom((get) => get(baseAtom))
    const midAtom2 = atom((get) => get(baseAtom))
    const leafAtom = atom((get) => get(midAtom1) + get(midAtom2))

    const unsub = store.sub(leafAtom, () => {})
    const buildingBlocks = INTERNAL_getBuildingBlocks(store)
    const invalidateDependents = buildingBlocks[KEY_invalidateDependents]
    expect(() =>
      invalidateDependents(buildingBlocks, store, baseAtom),
    ).not.toThrow()
    unsub()
  })

  describe('deep dependency graphs', () => {
    function makeChain(depth: number) {
      const base = atom(0)
      const chain: Atom<unknown>[] = [base]
      for (let i = 0; i < depth; i++) {
        const parent = chain[chain.length - 1]!
        chain.push(atom((get) => get(parent)))
      }
      return { base, chain, leaf: chain[chain.length - 1]! }
    }
    const tooDeep = measureMaxSyncRecursionDepth() * 10

    it('surfaces a stack overflow at the call site instead of swallowing it', () => {
      const store = createStore()
      const { leaf } = makeChain(tooDeep)
      expect(() => store.get(leaf)).toThrow(/call stack|recursion/i)
    })

    it('does not poison the atom state after a stack overflow', () => {
      const store = createStore()
      const { chain, leaf } = makeChain(tooDeep)
      try {
        store.get(leaf)
      } catch {
        // expected
      }
      // Warm the graph bottom-up so each read is shallow.
      chain.forEach((a) => store.get(a))
      expect(store.get(leaf)).toBe(0)
    })

    it('still caches a genuine error thrown by an atom read', () => {
      const store = createStore()
      const read = vi.fn(() => {
        throw new Error('boom')
      })
      const boom = atom(read)
      const dependent = atom((get) => get(boom))
      expect(() => store.get(dependent)).toThrow('boom')
      // A real read error is cached, so a second read rethrows the same error.
      expect(() => store.get(dependent)).toThrow('boom')
      expect(read).toHaveBeenCalledTimes(1)
    })

    it('still caches user errors that look like stack overflow messages', () => {
      const store = createStore()
      const error = new Error('Maximum call stack size exceeded')
      const read = vi.fn(() => {
        throw error
      })
      const errorAtom = atom(read)

      expect(() => store.get(errorAtom)).toThrow(error)
      expect(() => store.get(errorAtom)).toThrow(error)
      expect(read).toHaveBeenCalledTimes(1)
    })
  })
})

describe('store hooks', () => {
  // Helper function to create store with hooks
  const createStoreWithHooks = () => {
    const storeHooks = INTERNAL_initializeStoreHooks({})
    const store = INTERNAL_buildStore({ [KEY_storeHooks]: storeHooks })
    return { store, storeHooks }
  }

  describe('init hook (i)', () => {
    it('should call init hook when atom state is initialized', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const baseAtom = atom(0)
      const initCallback = vi.fn()
      storeHooks.i.add(baseAtom, initCallback)
      store.get(baseAtom)
      expect(initCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('read hook (r)', () => {
    it('should call read hook when atom is read', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const baseAtom = atom(0)
      const derivedAtom = atom((get) => get(baseAtom))
      const readCallback = vi.fn()

      storeHooks.r.add(derivedAtom, readCallback)
      store.get(derivedAtom)
      expect(readCallback).toHaveBeenCalledTimes(1)
      readCallback.mockClear()
      store.get(derivedAtom)
      expect(readCallback).toHaveBeenCalledTimes(0)
      store.set(baseAtom, 1)
      store.get(derivedAtom)
      expect(readCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('mount hook (m)', () => {
    it('should call mount hook when atom is mounted', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const countAtom = atom(0)
      const mountCallback = vi.fn()

      storeHooks.m.add(countAtom, mountCallback)
      const unsub = store.sub(countAtom, () => {})

      expect(mountCallback).toHaveBeenCalledTimes(1)
      unsub()
    })
  })

  describe('unmount hook (u)', () => {
    it('should call unmount hook when atom is unmounted', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const countAtom = atom(0)
      const unmountCallback = vi.fn()

      storeHooks.u.add(countAtom, unmountCallback)
      const unsub = store.sub(countAtom, () => {})
      unsub()

      expect(unmountCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('change hook (c)', () => {
    it('should call change hook when atom value changes', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const countAtom = atom(0)
      const changeCallback = vi.fn()

      storeHooks.c.add(countAtom, changeCallback)
      const unsub = store.sub(countAtom, () => {})
      store.set(countAtom, 1)

      expect(changeCallback).toHaveBeenCalledTimes(1)
      changeCallback.mockClear()
      store.set(countAtom, 1)
      expect(changeCallback).toHaveBeenCalledTimes(0)
      unsub()
    })
  })

  describe('flush hook (f)', () => {
    it('should call flush hook when callbacks are flushed', () => {
      const { store, storeHooks } = createStoreWithHooks()
      const countAtom = atom(0)
      const flushCallback = vi.fn()

      storeHooks.f.add(flushCallback)
      const unsub = store.sub(countAtom, () => {})
      expect(flushCallback).toHaveBeenCalledTimes(1)
      flushCallback.mockClear()
      store.set(countAtom, 1)
      expect(flushCallback).toHaveBeenCalledTimes(1)
      flushCallback.mockClear()
      unsub()
      expect(flushCallback).toHaveBeenCalledTimes(1)
    })
  })
})

function isBuildingBlocks(blocks: object | undefined) {
  return (
    blocks !== undefined &&
    Object.keys(blocks).length === buildingBlockKeys.length &&
    buildingBlockKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(blocks, key),
    )
  )
}

/** Deepest nested synchronous self-call before the engine throws (overflows). */
function measureMaxSyncRecursionDepth(): number {
  let max = 0
  const descend = (n: number) => {
    try {
      descend(n + 1)
    } catch {
      max = n
    }
  }
  descend(0)
  return max
}

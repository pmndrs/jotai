import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai'
import type {
  INTERNAL_AtomState,
  INTERNAL_AtomStateMap,
  INTERNAL_BuildingBlocks,
  INTERNAL_InvalidatedAtoms,
} from 'jotai/vanilla/internals'
import {
  INTERNAL_buildStoreRev3 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev3 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev3 as INTERNAL_initializeStoreHooks,
} from 'jotai/vanilla/internals'

const buildingBlockLength = 29

describe('internals', () => {
  it('should not return a sparse building blocks array', () => {
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
    const buildingBlocks1: Partial<INTERNAL_BuildingBlocks> = [
      mockAtomStateMap1,
    ]
    const store1 = INTERNAL_buildStore(...buildingBlocks1)
    const buildingBlocks2 = [
      ...INTERNAL_getBuildingBlocks(store1),
    ] as INTERNAL_BuildingBlocks
    const mockAtomStateMap2 = createMockAtomStateMap()
    buildingBlocks2[0] = mockAtomStateMap2
    const store2 = INTERNAL_buildStore(...buildingBlocks2)
    store2.get(atom(0))
    expect(mockAtomStateMap1.get).not.toBeCalled()
    expect(mockAtomStateMap2.get).toBeCalled()
  })

  it('should transform external building blocks differently from internal ones', () => {
    const didRun = {
      internal: vi.fn(),
      external: vi.fn(),
    }
    const bb0 = [] as Partial<INTERNAL_BuildingBlocks>
    bb0[21] = function storeGet1() {
      didRun.internal()
    } as INTERNAL_BuildingBlocks[21]
    let bbInternal: Readonly<INTERNAL_BuildingBlocks> | undefined
    function storeGet() {
      didRun.external()
    }
    bb0[24] = (bbi) => {
      bbInternal = bbi
      const bb1 = [...bbi] as INTERNAL_BuildingBlocks
      bb1[21] = storeGet as INTERNAL_BuildingBlocks[21]
      return bb1
    }
    const store1 = INTERNAL_buildStore(...bb0)
    const bb1 = INTERNAL_getBuildingBlocks(store1)
    expect(isBuildingBlocks(bb1)).toBe(true)
    expect(isBuildingBlocks(bbInternal)).toBe(true)
    const store2 = INTERNAL_buildStore(...bb1)
    const bb2 = INTERNAL_getBuildingBlocks(store2)
    expect(isBuildingBlocks(bb2)).toBe(true)
    expect(isBuildingBlocks(bbInternal)).toBe(true)
    expect(bb0[21]).not.toBe(bb1[21])
    expect(bb1[21]).toBe(bb2[21])
    store1.get(atom(0))
    expect(didRun.internal).toBeCalledTimes(1)
    expect(didRun.external).toBeCalledTimes(0)
    vi.clearAllMocks()
    store2.get(atom(0))
    expect(didRun.internal).toBeCalledTimes(0)
    expect(didRun.external).toBeCalledTimes(1)
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
    const buildingBlocks = [...rawBlocks] as INTERNAL_BuildingBlocks
    const ras = vi.fn(buildingBlocks[14])
    buildingBlocks[14] = ras as (typeof buildingBlocks)[14]
    const store = INTERNAL_buildStore(...buildingBlocks)
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
    const buildingBlocks = [...rawBlocks] as INTERNAL_BuildingBlocks
    const ras = vi.fn(buildingBlocks[14])
    buildingBlocks[14] = ras as (typeof buildingBlocks)[14]
    const store = INTERNAL_buildStore(...buildingBlocks)

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

    const partialBuildingBlocks: Partial<INTERNAL_BuildingBlocks> = []
    partialBuildingBlocks[2] = invalidatedAtoms
    const store = INTERNAL_buildStore(...partialBuildingBlocks)

    const baseAtom = atom(0)
    const midAtom1 = atom((get) => get(baseAtom))
    const midAtom2 = atom((get) => get(baseAtom))
    const leafAtom = atom((get) => get(midAtom1) + get(midAtom2))

    const unsub = store.sub(leafAtom, () => {})
    const buildingBlocks = INTERNAL_getBuildingBlocks(store)
    const invalidateDependents = buildingBlocks[15]
    expect(() =>
      invalidateDependents(buildingBlocks, store, baseAtom),
    ).not.toThrow()
    unsub()
  })
})

describe('store hooks', () => {
  // Helper function to create store with hooks
  const createStoreWithHooks = () => {
    const storeHooks = INTERNAL_initializeStoreHooks({})
    const buildingBlocks = [] as Partial<INTERNAL_BuildingBlocks>
    buildingBlocks[6] = storeHooks
    const store = INTERNAL_buildStore(...buildingBlocks)
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

function isSparse(arr: ReadonlyArray<unknown>) {
  return arr.some((_, i) => !Object.prototype.hasOwnProperty.call(arr, i))
}

function isBuildingBlocks(blocks: ReadonlyArray<unknown> | undefined) {
  return (
    blocks !== undefined &&
    blocks.length === buildingBlockLength &&
    isSparse(blocks) === false
  )
}

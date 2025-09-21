import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai'
import type {
  INTERNAL_AtomState,
  INTERNAL_AtomStateMap,
  INTERNAL_BuildingBlocks,
} from 'jotai/vanilla/internals'
import {
  INTERNAL_buildStoreRev2 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev2 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev2 as INTERNAL_initializeStoreHooks,
} from 'jotai/vanilla/internals'

describe('internals', () => {
  it('should not return a sparse building blocks array', () => {
    const isSparse = (arr: ReadonlyArray<unknown>) => {
      return arr.some((_, i) => !Object.prototype.hasOwnProperty.call(arr, i))
    }
    {
      const store = createStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(buildingBlocks.length).toBe(24)
      expect(isSparse(buildingBlocks)).toBe(false)
    }
    {
      const store = INTERNAL_buildStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(buildingBlocks.length).toBe(24)
      expect(isSparse(buildingBlocks)).toBe(false)
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

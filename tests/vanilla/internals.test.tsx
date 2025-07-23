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

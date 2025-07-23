import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai'
import {
  type INTERNAL_AtomState as AtomState,
  type INTERNAL_AtomStateMap as AtomStateMap,
  type INTERNAL_BuildingBlocks as BuildingBlocks,
  INTERNAL_buildStoreRev2 as buildStore,
  INTERNAL_getBuildingBlocksRev2 as getBuildingBlocks,
} from 'jotai/vanilla/internals'

describe('internals', () => {
  it('should not return a sparse building blocks array', () => {
    const isSparse = (arr: ReadonlyArray<unknown>) => {
      return arr.some((_, i) => !Object.prototype.hasOwnProperty.call(arr, i))
    }
    {
      const store = createStore()
      const buildingBlocks = getBuildingBlocks(store)
      expect(buildingBlocks.length).toBe(24)
      expect(isSparse(buildingBlocks)).toBe(false)
    }
    {
      const store = buildStore()
      const buildingBlocks = getBuildingBlocks(store)
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
          } satisfies AtomState
        }),
        set: vi.fn(),
      } satisfies AtomStateMap
    }
    const mockAtomStateMap1 = createMockAtomStateMap()
    const buildingBlocks1: Partial<BuildingBlocks> = [mockAtomStateMap1]
    const store1 = buildStore(...buildingBlocks1)
    const buildingBlocks2: BuildingBlocks = [...getBuildingBlocks(store1)]
    const mockAtomStateMap2 = createMockAtomStateMap()
    buildingBlocks2[0] = mockAtomStateMap2
    const store2 = buildStore(...buildingBlocks2)
    store2.get(atom(0))
    expect(mockAtomStateMap1.get).not.toBeCalled()
    expect(mockAtomStateMap2.get).toBeCalled()
  })
})

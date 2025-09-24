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

const buildingBlockLength = 25

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

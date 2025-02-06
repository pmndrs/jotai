import { describe, expect, it } from 'vitest'
import { createStore } from 'jotai'
import {
  INTERNAL_buildStoreRev1 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks,
} from 'jotai/vanilla/internals'

describe('internals', () => {
  it('should not return a sparse building blocks array', () => {
    const isSparse = (arr: ReadonlyArray<unknown>) => {
      return arr.some((_, i) => !Object.prototype.hasOwnProperty.call(arr, i))
    }
    {
      const store = createStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(buildingBlocks.length).toBe(20)
      expect(isSparse(buildingBlocks)).toBe(false)
    }
    {
      const store = INTERNAL_buildStore()
      const buildingBlocks = INTERNAL_getBuildingBlocks(store)
      expect(buildingBlocks.length).toBe(20)
      expect(isSparse(buildingBlocks)).toBe(false)
    }
  })
})

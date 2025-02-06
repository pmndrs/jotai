import { describe } from 'node:test'
import { expect, it } from 'vitest'
import { createStore } from 'jotai'
import { INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks } from 'jotai/vanilla/internals'

describe('internals', () => {
  it('should not return a sparse building blocks array', () => {
    function isSparse(arr: ReadonlyArray<unknown>) {
      return arr.some((_, i) => !arr.hasOwnProperty(i))
    }
    const store = createStore()
    const buildingBlocks = INTERNAL_getBuildingBlocks(store)
    expect(buildingBlocks.length).toBe(20)
    expect(isSparse(buildingBlocks)).toBe(false)
  })
})

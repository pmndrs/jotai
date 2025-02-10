import { describe, expect, it, vi } from 'vitest'
import { atom, createStore, useAtomValue } from 'jotai'
import {
  INTERNAL_buildStoreRev1 as INTERNAL_buildStore,
  INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks,
  INTERNAL_initializeStoreHooks,
} from 'jotai/vanilla/internals'
import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'

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

  it('should call onMount and onUnmount once in strict mode', () => {
    const onMountHook = vi.fn()
    const onUnmountHook = vi.fn()
    const countAtom = atom(0)
    const onUnmount = vi.fn()
    const onMount = vi.fn(() => onUnmount)
    countAtom.onMount = onMount
    const store = createStore()
    const buildingBlocks = INTERNAL_getBuildingBlocks(store)
    const storeHooks = INTERNAL_initializeStoreHooks(buildingBlocks[6])
    storeHooks.m.add(countAtom, onMountHook)
    storeHooks.u.add(countAtom, onUnmountHook)
    const useMountAtom = () => useAtomValue(countAtom, { store })
    const { unmount } = renderHook(useMountAtom, { wrapper: StrictMode })
    expect(onMount).toHaveBeenCalledTimes(1)
    expect(onUnmount).toHaveBeenCalledTimes(0)
    expect(onMountHook).toHaveBeenCalledTimes(1)
    expect(onUnmountHook).toHaveBeenCalledTimes(0)
    unmount()
    expect(onUnmount).toHaveBeenCalledTimes(1)
    expect(onUnmountHook).toHaveBeenCalledTimes(1)
  })
})

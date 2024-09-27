import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'jotai/vanilla'
import { RESET, atomWithReset } from 'jotai/vanilla/utils'

describe('atomWithReset', () => {
  let initialValue: number
  let testAtom: any

  beforeEach(() => {
    vi.clearAllMocks()
    initialValue = 10
    testAtom = atomWithReset(initialValue)
  })

  it('should reset to initial value using RESET', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, RESET)
    expect(store.get(testAtom)).toBe(initialValue)
  })

  it('should update atom with a new value', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, 30)
    expect(store.get(testAtom)).toBe(30)
  })

  it('should update atom using a function', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, (prev: number) => prev + 10)
    expect(store.get(testAtom)).toBe(133)
  })
})

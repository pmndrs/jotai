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

  it('should create an atom with initial value', () => {
    const { init } = testAtom
    expect(init).toBe(initialValue)
  })

  it('should reset to initial value using RESET', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, RESET)
    expect(store.get(testAtom)).toBe(initialValue)

    const set = vi.fn()
    const get = vi.fn(() => 20)
    testAtom.write(get, set, RESET)
    expect(set).toHaveBeenCalledWith(testAtom, initialValue)
  })

  it('should update atom with a new value', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, 30)
    expect(store.get(testAtom)).toBe(30)

    const set = vi.fn()
    const get = vi.fn(() => 20)
    testAtom.write(get, set, 30)
    expect(set).toHaveBeenCalledWith(testAtom, 30)
  })

  it('should update atom using a function', () => {
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, (prev: number) => prev + 10)
    expect(store.get(testAtom)).toBe(133)

    const set = vi.fn()
    const get = vi.fn(() => 20)
    const updateFn = (prev: number) => prev + 10
    testAtom.write(get, set, updateFn)
    expect(set).toHaveBeenCalledWith(testAtom, 30)
  })
})

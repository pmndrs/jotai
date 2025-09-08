import { beforeEach, describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { RESET, atomWithDefault } from 'jotai/vanilla/utils'

describe('atomWithDefault', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reset to initial value using RESET', () => {
    const initialValue = 10
    const testAtom = atomWithDefault(() => initialValue)
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, RESET)
    expect(store.get(testAtom)).toBe(initialValue)
  })

  it('should reset to initial value derived from another atom', () => {
    const initialValueAtom = atom(10)
    const testAtom = atomWithDefault((get) => get(initialValueAtom))
    const store = createStore()
    expect(store.get(testAtom)).toBe(10)
    store.set(testAtom, 123)
    store.set(initialValueAtom, 20)
    store.set(testAtom, RESET)
    expect(store.get(testAtom)).toBe(20)
  })

  it(`should reflect changes to the initial value atom when main atom hasn't been manually changed`, () => {
    const initialValueAtom = atom(10)
    const testAtom = atomWithDefault((get) => get(initialValueAtom))
    const store = createStore()
    store.set(initialValueAtom, 20)
    expect(store.get(testAtom)).toBe(20)
  })

  it(`should reflect changes to the initial value atom when main atom has been manually changed but then RESET`, () => {
    const initialValueAtom = atom(10)
    const testAtom = atomWithDefault((get) => get(initialValueAtom))
    const store = createStore()
    store.set(testAtom, 123)
    // if this RESET were storing 10 rather than EMPTY the next set wouldn't have an effect
    store.set(testAtom, RESET)
    store.set(initialValueAtom, 20)
    expect(store.get(testAtom)).toBe(20)
  })

  it('should update atom with a new value', () => {
    const initialValue = 10
    const testAtom = atomWithDefault(() => initialValue)
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, 30)
    expect(store.get(testAtom)).toBe(30)
  })

  it('should update atom using a function', () => {
    const initialValue = 10
    const testAtom = atomWithDefault(() => initialValue)
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, (prev: number) => prev + 10)
    expect(store.get(testAtom)).toBe(133)
  })

  it('should reset with a function', () => {
    const initialValue = 10
    const testAtom = atomWithDefault(() => initialValue)
    const store = createStore()
    store.set(testAtom, 123)
    store.set(testAtom, () => RESET)
    expect(store.get(testAtom)).toBe(initialValue)
  })
})

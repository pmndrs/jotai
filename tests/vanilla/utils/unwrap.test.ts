import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { unwrap } from 'jotai/vanilla/utils'

describe('unwrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should unwrap a promise with no fallback function', async () => {
    const store = createStore()
    const countAtom = atom(1)
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
      return count * 2
    })
    const syncAtom = unwrap(asyncAtom)

    expect(store.get(syncAtom)).toBe(undefined)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(undefined)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(4)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(undefined)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(6)
  })

  it('should unwrap a promise with fallback function without prev', async () => {
    const store = createStore()
    const countAtom = atom(1)
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
      return count * 2
    })
    const syncAtom = unwrap(asyncAtom, () => -1)

    expect(store.get(syncAtom)).toBe(-1)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(-1)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(4)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(-1)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(6)
  })

  it('should unwrap a promise with fallback function with prev', async () => {
    const store = createStore()
    const countAtom = atom(1)
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 100))
      return count * 2
    })
    const syncAtom = unwrap(asyncAtom, (prev?: number) => prev ?? 0)

    expect(store.get(syncAtom)).toBe(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(2)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(4)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(4)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(6)

    store.set(countAtom, 4)
    expect(store.get(syncAtom)).toBe(6)
    store.set(countAtom, 5)
    expect(store.get(syncAtom)).not.toBe(0) // expect 6 or 8
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(10)
  })

  it('should unwrap a sync atom which is noop', () => {
    const store = createStore()
    const countAtom = atom(1)
    const syncAtom = unwrap(countAtom)

    expect(store.get(syncAtom)).toBe(1)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(3)
  })

  it('should unwrap an async writable atom', async () => {
    const store = createStore()
    const asyncAtom = atom(
      new Promise<number>((resolve) => setTimeout(() => resolve(1), 100)),
    )
    const syncAtom = unwrap(asyncAtom, (prev?: number) => prev ?? 0)

    expect(store.get(syncAtom)).toBe(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(1)

    store.set(
      syncAtom,
      new Promise<number>((resolve) => setTimeout(() => resolve(2), 100)),
    )
    expect(store.get(syncAtom)).toBe(1)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(2)

    store.set(
      syncAtom,
      new Promise<number>((resolve) => setTimeout(() => resolve(3), 100)),
    )
    expect(store.get(syncAtom)).toBe(2)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toBe(3)
  })

  it('should unwrap to a fulfilled value of an already resolved async atom', async () => {
    const store = createStore()
    const asyncAtom = atom(
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('concrete'), 100),
      ),
    )

    expect(store.get(unwrap(asyncAtom))).toEqual(undefined)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(unwrap(asyncAtom))).toEqual('concrete')
  })

  it('should get a fulfilled value after the promise resolves', async () => {
    const store = createStore()
    const asyncAtom = atom(
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('concrete'), 100),
      ),
    )
    const syncAtom = unwrap(asyncAtom)

    expect(store.get(syncAtom)).toEqual(undefined)
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(syncAtom)).toEqual('concrete')
  })

  it('should throw an error if underlying promise is rejected', async () => {
    const store = createStore()
    const asyncAtom = atom(Promise.reject<number>('error'))
    const syncAtom = unwrap(asyncAtom)
    store.sub(syncAtom, () => {})

    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(() => store.get(syncAtom)).toThrow('error')

    store.set(asyncAtom, Promise.resolve(3))

    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(3)
  })
})

  it('should update dependents with the value of the unwrapped atom when the promise resolves', async () => {
    const store = createStore()
    const asyncTarget = atom(() => Promise.resolve('value'))
    const target = unwrap(asyncTarget)
    const results: string[] = []
    const derived = atom(async (get) => {
      await Promise.resolve()
      results.push('effect ' + get(target))
    })

    store.sub(derived, () => {})

    await vi.advanceTimersByTimeAsync(0)
    expect(results).toEqual(['effect undefined', 'effect value'])
  })
})

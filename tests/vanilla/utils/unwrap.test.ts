import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { unwrap } from 'jotai/vanilla/utils'

describe('unwrap', () => {
  it('should unwrap a promise with no fallback function', async () => {
    const store = createStore()
    const countAtom = atom(1)
    let resolve = () => {}
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((r) => (resolve = r))
      return count * 2
    })

    const syncAtom = unwrap(asyncAtom)

    expect(store.get(syncAtom)).toBe(undefined)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(undefined)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(4)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(undefined)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(6)
  })

  it('should unwrap a promise with fallback function without prev', async () => {
    const store = createStore()
    const countAtom = atom(1)
    let resolve = () => {}
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((r) => (resolve = r))
      return count * 2
    })
    const syncAtom = unwrap(asyncAtom, () => -1)
    expect(store.get(syncAtom)).toBe(-1)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(2)
    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(-1)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(4)
    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(-1)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(6)
  })

  it('should unwrap a promise with fallback function with prev', async () => {
    const store = createStore()
    const countAtom = atom(1)
    let resolve = () => {}
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((r) => (resolve = r))
      return count * 2
    })
    const syncAtom = unwrap(asyncAtom, (prev?: number) => prev ?? 0)

    expect(store.get(syncAtom)).toBe(0)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(2)

    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(2)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(4)

    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(4)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(6)

    store.set(countAtom, 4)
    expect(store.get(syncAtom)).toBe(6)
    resolve()
    store.set(countAtom, 5)
    expect(store.get(syncAtom)).not.toBe(0) // expect 6 or 8
    resolve()
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(10)
  })

  it('should unwrap a sync atom which is noop', async () => {
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
    const asyncAtom = atom(Promise.resolve(1))
    const syncAtom = unwrap(asyncAtom, (prev?: number) => prev ?? 0)

    expect(store.get(syncAtom)).toBe(0)
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(1)

    store.set(syncAtom, Promise.resolve(2))
    expect(store.get(syncAtom)).toBe(1)
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(2)

    store.set(syncAtom, Promise.resolve(3))
    expect(store.get(syncAtom)).toBe(2)
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(syncAtom)).toBe(3)
  })
})

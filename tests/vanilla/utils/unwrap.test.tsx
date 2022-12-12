import { atom, createStore } from 'jotai/vanilla'
import { unstable_unwrap as unwrap } from 'jotai/vanilla/utils'

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
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(2)
    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(undefined)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(4)
    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(undefined)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
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
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(2)
    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(-1)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(4)
    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(-1)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
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
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(2)
    store.set(countAtom, 2)
    expect(store.get(syncAtom)).toBe(2)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(4)
    store.set(countAtom, 3)
    expect(store.get(syncAtom)).toBe(4)
    resolve()
    await new Promise((r) => setTimeout(r)) // wait a tick
    expect(store.get(syncAtom)).toBe(6)
  })
})

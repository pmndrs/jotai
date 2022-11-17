import { atom, createStore } from 'jotai/vanilla'
import { unstable_unwrapAtom as unwrapAtom } from 'jotai/vanilla/utils'

describe('unwrapAtom', () => {
  it('should unwrap a promise', async () => {
    const store = createStore()
    const countAtom = atom(1)
    let resolve = () => {}
    const asyncAtom = atom(async (get) => {
      const count = get(countAtom)
      await new Promise<void>((r) => (resolve = r))
      return count * 2
    })
    const syncAtom = unwrapAtom(asyncAtom, 0)
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

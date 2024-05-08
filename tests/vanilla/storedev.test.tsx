import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

const IS_DEV_STORE = 'dev_subscribe_store' in createStore()
const IS_DEV_STORE2 = 'dev4_get_internal_weak_map' in createStore()

describe.skipIf(!IS_DEV_STORE)('[DEV-ONLY] dev-only methods rev2', () => {
  it('should return the values of all mounted atoms', () => {
    const store = createStore()
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const derivedAtom = atom((get) => get(countAtom) * 0)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)

    const result = store.dev_get_mounted_atoms?.() || []
    expect(
      Array.from(result).sort(
        (a, b) => Object.keys(a).length - Object.keys(b).length,
      ),
    ).toStrictEqual([
      { toString: expect.any(Function), read: expect.any(Function) },
      {
        toString: expect.any(Function),
        init: 0,
        read: expect.any(Function),
        write: expect.any(Function),
        debugLabel: 'countAtom',
      },
    ])
    unsub()
  })

  it('should get atom state of a given atom', () => {
    const store = createStore()
    const countAtom = atom(0)
    const unsub = store.sub(countAtom, vi.fn())
    store.set(countAtom, 1)
    const result = store.dev_get_atom_state?.(countAtom)
    expect(result).toHaveProperty('v', 1)
    unsub()
  })

  it('should get mounted atom from mounted map', () => {
    const store = createStore()
    const countAtom = atom(0)
    const cb = vi.fn()
    const unsub = store.sub(countAtom, cb)
    store.set(countAtom, 1)
    const result = store.dev_get_mounted?.(countAtom)
    expect(result).toStrictEqual({ l: new Set([cb]), t: new Set([countAtom]) })
    unsub()
  })

  it('should restore atoms and its dependencies correctly', () => {
    const store = createStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    store.set(countAtom, 1)
    store.dev_restore_atoms?.([[countAtom, 2]])
    expect(store.get(countAtom)).toBe(2)
    expect(store.get?.(derivedAtom)).toBe(4)
  })

  describe('dev_subscribe_store rev2', () => {
    it('should call the callback when state changes', () => {
      const store = createStore()
      const callback = vi.fn()
      const unsub = store.dev_subscribe_store?.(callback, 2)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, vi.fn())
      store.set(countAtom, 1)
      expect(callback).toHaveBeenNthCalledWith(1, {
        type: 'sub',
        flushed: new Set([countAtom]),
      })
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'write',
        flushed: new Set([countAtom]),
      })
      expect(callback).toHaveBeenCalledTimes(2)
      unsub?.()
      unsubAtom?.()
    })

    it('should call unsub only when atom is unsubscribed', () => {
      const store = createStore()
      const callback = vi.fn()
      const unsub = store.dev_subscribe_store?.(callback, 2)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, vi.fn())
      const unsubAtomSecond = store.sub(countAtom, vi.fn())
      unsubAtom?.()
      expect(callback).toHaveBeenNthCalledWith(1, {
        type: 'sub',
        flushed: new Set([countAtom]),
      })
      expect(callback).toHaveBeenNthCalledWith(2, {
        type: 'sub',
        flushed: new Set(),
      })
      expect(callback).toHaveBeenNthCalledWith(3, { type: 'unsub' })
      expect(callback).toHaveBeenCalledTimes(3)
      unsub?.()
      unsubAtomSecond?.()
    })
  })

  it('should unmount tree dependencies with store.get', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const anotherDerivedAtom = atom((get) => get(countAtom) * 3)
    const callback = vi.fn()
    const unsubStore = store.dev_subscribe_store?.(() => {
      // Comment this line to make the test pass
      store.get(derivedAtom)
    }, 2)
    const unsub = store.sub(anotherDerivedAtom, callback)
    unsub()
    unsubStore?.()
    const result = Array.from(store.dev_get_mounted_atoms?.() ?? [])
    expect(result).toEqual([])
  })
})

describe.skipIf(!IS_DEV_STORE2)('[DEV-ONLY] dev-only methods rev4', () => {
  it('should get atom value', () => {
    const store = createStore() as any
    if (!('dev4_get_internal_weak_map' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    store.set(countAtom, 1)
    const weakMap = store.dev4_get_internal_weak_map()
    expect(weakMap.get(countAtom)?.v).toEqual(1)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type {
  INTERNAL_DevStoreRev4,
  INTERNAL_PrdStore,
} from 'jotai/vanilla/store'

describe('[DEV-ONLY] dev-only methods rev4', () => {
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

  it('should restore atoms and its dependencies correctly', () => {
    const store = createStore() as any
    if (!('dev4_restore_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    store.set(countAtom, 1)
    store.dev4_restore_atoms([[countAtom, 2]])
    expect(store.get(countAtom)).toBe(2)
    expect(store.get?.(derivedAtom)).toBe(4)
  })

  it('should restore atoms and call store listeners correctly', () => {
    const store = createStore() as any
    if (!('dev4_restore_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const countCb = vi.fn()
    const derivedCb = vi.fn()
    store.set(countAtom, 2)
    const unsubCount = store.sub(countAtom, countCb)
    const unsubDerived = store.sub(derivedAtom, derivedCb)
    store.dev4_restore_atoms([
      [countAtom, 1],
      [derivedAtom, 2],
    ])

    expect(countCb).toHaveBeenCalled()
    expect(derivedCb).toHaveBeenCalled()
    unsubCount()
    unsubDerived()
  })

  it('should return all the mounted atoms correctly', () => {
    const store = createStore() as INTERNAL_DevStoreRev4 & INTERNAL_PrdStore
    if (!('dev4_get_mounted_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)
    const result = store.dev4_get_mounted_atoms()
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

  it("should return all the mounted atoms correctly after they're unsubscribed", () => {
    const store = createStore() as INTERNAL_DevStoreRev4 & INTERNAL_PrdStore
    if (!('dev4_get_mounted_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)
    unsub()
    const result = store.dev4_get_mounted_atoms()
    expect(Array.from(result)).toStrictEqual([])
  })
})

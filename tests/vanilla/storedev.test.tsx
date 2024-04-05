import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

describe('[DEV-ONLY] dev-only methods rev2', () => {
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

describe('[DEV-ONLY] dev-only methods rev3', () => {
  it('should return the values of all mounted atoms', () => {
    const store = createStore()
    if (!('dev3_get_mounted_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const derivedAtom = atom((get) => get(countAtom) * 0)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)
    const result = store.dev3_get_mounted_atoms() || []
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
    if (!('dev3_get_atom_state' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const unsub = store.sub(countAtom, vi.fn())
    store.set(countAtom, 1)
    const result = store.dev3_get_atom_state(countAtom)
    expect(result).toHaveProperty('v', 1)
    unsub()
  })

  it('should get atom deps', () => {
    const store = createStore()
    if (!('dev3_get_atom_state' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const cb = vi.fn()
    const unsub = store.sub(countAtom, cb)
    store.set(countAtom, 1)
    const result = store.dev3_get_atom_state(countAtom)
    expect(result?.d && Array.from(result.d)).toStrictEqual([])
    unsub()
  })

  it('should get atom deps 2', () => {
    const store = createStore()
    if (!('dev3_get_atom_state' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const doubleAtom = atom((get) => get(countAtom) * 2)
    const cb = vi.fn()
    const unsub = store.sub(doubleAtom, cb)
    store.set(countAtom, 1)
    const result = store.dev3_get_atom_state(doubleAtom)
    expect(result?.d && Array.from(result.d)).toStrictEqual([countAtom])
    unsub()
  })

  it('should restore atoms and its dependencies correctly', () => {
    const store = createStore()
    if (!('dev3_restore_atoms' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    store.set(countAtom, 1)
    store.dev3_restore_atoms([[countAtom, 2]])
    expect(store.get(countAtom)).toBe(2)
    expect(store.get(derivedAtom)).toBe(4)
  })

  describe('dev3_subscribe_store', () => {
    it('should call the callback when state changes', () => {
      const store = createStore()
      if (!('dev3_subscribe_store' in store)) {
        throw new Error('dev methods are not available')
      }
      const callback = vi.fn()
      const unsub = store.dev3_subscribe_store(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, vi.fn())
      store.set(countAtom, 1)
      expect(callback).toHaveBeenNthCalledWith(1, {
        type: 'set',
        atom: countAtom,
      })
      expect(callback).toHaveBeenCalledTimes(1)
      unsub()
      unsubAtom()
    })

    it('should call unsub only when atom is unsubscribed', () => {
      const store = createStore()
      if (!('dev3_subscribe_store' in store)) {
        throw new Error('dev methods are not available')
      }
      const callback = vi.fn()
      const unsub = store.dev3_subscribe_store(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, vi.fn())
      const unsubAtomSecond = store.sub(countAtom, vi.fn())
      unsubAtom()
      expect(callback).toHaveBeenNthCalledWith(1, { type: 'unsub' })
      expect(callback).toHaveBeenCalledTimes(1)
      unsub()
      unsubAtomSecond()
    })
  })

  it('should unmount tree dependencies with store.get', async () => {
    const store = createStore()
    if (!('dev3_subscribe_store' in store)) {
      throw new Error('dev methods are not available')
    }
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const anotherDerivedAtom = atom((get) => get(countAtom) * 3)
    const callback = vi.fn()
    const unsubStore = store.dev3_subscribe_store(() => {
      // Comment this line to make the test pass
      store.get(derivedAtom)
    })
    const unsub = store.sub(anotherDerivedAtom, callback)
    unsub()
    unsubStore()
    const result = Array.from(store.dev3_get_mounted_atoms() ?? [])
    expect(result).toEqual([])
  })
})

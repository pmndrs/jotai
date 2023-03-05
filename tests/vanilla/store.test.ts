import { atom, createStore } from 'jotai/vanilla'

describe('store', () => {
  it('should not fire on subscribe', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    store.sub(countAtom, callback1)
    store.sub(countAtom, callback2)
    expect(callback1).not.toBeCalled()
    expect(callback2).not.toBeCalled()
  })

  it('should not fire subscription if primitive atom value is the same', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const callback = vi.fn()
    store.sub(countAtom, callback)
    const calledTimes = callback.mock.calls.length
    store.set(countAtom, 0)
    expect(callback).toBeCalledTimes(calledTimes)
  })

  it('should not fire subscription if derived atom value is the same', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 0)
    const callback = vi.fn()
    store.sub(derivedAtom, callback)
    const calledTimes = callback.mock.calls.length
    store.set(countAtom, 1)
    expect(callback).toBeCalledTimes(calledTimes)
  })

  describe('[DEV-ONLY] dev-only methods', () => {
    it('should return the values of all mounted atoms', () => {
      const store = createStore()
      const countAtom = atom(0)
      countAtom.debugLabel = 'countAtom'
      const derivedAtom = atom((get) => get(countAtom) * 0)
      const unsub = store.sub(derivedAtom, vi.fn())
      store.set(countAtom, 1)

      const result = store.dev_get_mounted_atoms?.() || []
      expect(Array.from(result)).toStrictEqual([
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
      countAtom.debugLabel = 'countAtom'
      const unsub = store.sub(countAtom, vi.fn())
      store.set(countAtom, 1)
      const result = store.dev_get_atom_state?.(countAtom)
      expect(result).toHaveProperty('v', 1)
      unsub()
    })

    it('should get mounted atom from mounted map', () => {
      const store = createStore()
      const countAtom = atom(0)
      countAtom.debugLabel = 'countAtom'
      const cb = vi.fn()
      const unsub = store.sub(countAtom, cb)
      store.set(countAtom, 1)
      const result = store.dev_get_mounted?.(countAtom)
      expect(result).toStrictEqual({
        l: new Set([cb]),
        t: new Set([countAtom]),
      })
      unsub()
    })

    it('should restore atoms and its dependencies correctly', () => {
      const store = createStore()
      const countAtom = atom(0)
      countAtom.debugLabel = 'countAtom'
      const derivedAtom = atom((get) => get(countAtom) * 2)
      store.set(countAtom, 1)
      store.dev_restore_atoms?.([[countAtom, 2]])
      expect(store.get(countAtom)).toBe(2)
      expect(store.get?.(derivedAtom)).toBe(4)
    })

    describe('dev_subscribe_state', () => {
      it('should call the callback when state change is flushed out', () => {
        const store = createStore()
        const callback = vi.fn()
        const unsub = store.dev_subscribe_state?.(callback)
        const countAtom = atom(0)
        const unsubAtom = store.sub(countAtom, vi.fn())
        expect(callback).toHaveBeenCalledTimes(1)
        unsub?.()
        unsubAtom?.()
      })
    })

    describe('dev_subscribe_store', () => {
      it('should call the callback when state changes', () => {
        const store = createStore()
        const callback = vi.fn()
        const unsub = store.dev_subscribe_store?.(callback)
        const countAtom = atom(0)
        const unsubAtom = store.sub(countAtom, vi.fn())
        store.set(countAtom, 1)
        expect(callback).toHaveBeenNthCalledWith(1, 'state')
        expect(callback).toHaveBeenNthCalledWith(2, 'sub')
        expect(callback).toHaveBeenNthCalledWith(3, 'state')
        expect(callback).toHaveBeenCalledTimes(3)
        unsub?.()
        unsubAtom?.()
      })

      it('should call unsub only when atom is unsubscribed', () => {
        const store = createStore()
        const callback = vi.fn()
        const unsub = store.dev_subscribe_store?.(callback)
        const countAtom = atom(0)
        const unsubAtom = store.sub(countAtom, vi.fn())
        const unsubAtomSecond = store.sub(countAtom, vi.fn())
        unsubAtom?.()
        expect(callback).toHaveBeenNthCalledWith(1, 'state')
        expect(callback).toHaveBeenNthCalledWith(2, 'sub')
        expect(callback).toHaveBeenNthCalledWith(3, 'state')
        expect(callback).toHaveBeenNthCalledWith(4, 'sub')
        expect(callback).toHaveBeenNthCalledWith(5, 'unsub')
        expect(callback).toHaveBeenCalledTimes(5)
        unsub?.()
        unsubAtomSecond?.()
      })
    })
  })

  it('should unmount with store.get', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const callback = vi.fn()
    const unsub = store.sub(countAtom, callback)
    store.get(countAtom)
    unsub()
    const result = Array.from(store.dev_get_mounted_atoms?.() ?? [])
    expect(result).toEqual([])
  })

  it('should unmount dependencies with store.get', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const callback = vi.fn()
    const unsub = store.sub(derivedAtom, callback)
    store.get(derivedAtom)
    unsub()
    const result = Array.from(store.dev_get_mounted_atoms?.() ?? [])
    expect(result).toEqual([])
  })

  it('should unmount tree dependencies with store.get', async () => {
    const store = createStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const anotherDerivedAtom = atom((get) => get(countAtom) * 3)
    const callback = vi.fn()
    const unsubStore = store.dev_subscribe_store?.(() => {
      store.get(derivedAtom)
    })
    const unsub = store.sub(anotherDerivedAtom, callback)
    unsub()
    unsubStore?.()
    const result = Array.from(store.dev_get_mounted_atoms?.() ?? [])
    expect(result).toEqual([])
  })
})

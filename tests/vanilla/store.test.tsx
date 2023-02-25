import { describe, expect, it, jest } from '@jest/globals'
import { atom, createStore } from 'jotai/vanilla'

it('should not fire on subscribe', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback1 = jest.fn()
  const callback2 = jest.fn()
  store.sub(countAtom, callback1)
  store.sub(countAtom, callback2)
  expect(callback1).not.toBeCalled()
  expect(callback2).not.toBeCalled()
})

it('should not fire subscription if primitive atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback = jest.fn()
  store.sub(countAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 0)
  expect(callback).toBeCalledTimes(calledTimes)
})

it('should not fire subscription if derived atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom) * 0)
  const callback = jest.fn()
  store.sub(derivedAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 1)
  expect(callback).toBeCalledTimes(calledTimes)
})

describe('dev-only methods', () => {
  it('should return the values of all mounted atoms', () => {
    const store = createStore()
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const derivedAtom = atom((get) => get(countAtom) * 0)
    const unsub = store.sub(derivedAtom, jest.fn())
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
    const unsub = store.sub(countAtom, jest.fn())
    store.set(countAtom, 1)
    const result = store.dev_get_atom_state?.(countAtom)
    expect(result).toHaveProperty('v', 1)
    unsub()
  })

  it('should get mounted atom from mounted map', () => {
    const store = createStore()
    const countAtom = atom(0)
    countAtom.debugLabel = 'countAtom'
    const cb = jest.fn()
    const unsub = store.sub(countAtom, cb)
    store.set(countAtom, 1)
    const result = store.dev_get_mounted?.(countAtom)
    expect(result).toStrictEqual({ l: new Set([cb]), t: new Set([countAtom]) })
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
      const callback = jest.fn()
      const unsub = store.dev_subscribe_state?.(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, jest.fn())
      expect(callback).toHaveBeenCalledTimes(1)
      unsub?.()
      unsubAtom?.()
    })
  })
  describe('dev_subscribe_store', () => {
    it('should call the callback on mount', () => {
      const store = createStore()
      const callback = jest.fn()
      const unsub = store.dev_subscribe_store?.(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, jest.fn())
      expect(callback).toHaveBeenNthCalledWith(1, 'mount')
      expect(callback).toHaveBeenNthCalledWith(2, 'state')
      expect(callback).toHaveBeenNthCalledWith(3, 'sub')
      expect(callback).toHaveBeenCalledTimes(3)
      unsub?.()
      unsubAtom?.()
    })

    it('should call the callback when state changes', () => {
      const store = createStore()
      const callback = jest.fn()
      const unsub = store.dev_subscribe_store?.(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, jest.fn())
      store.set(countAtom, 1)
      expect(callback).toHaveBeenNthCalledWith(1, 'mount')
      expect(callback).toHaveBeenNthCalledWith(2, 'state')
      expect(callback).toHaveBeenNthCalledWith(3, 'sub')
      expect(callback).toHaveBeenNthCalledWith(4, 'state')
      expect(callback).toHaveBeenCalledTimes(4)
      unsub?.()
      unsubAtom?.()
    })

    it('should call the unmount when atom is unsubscribed', () => {
      const store = createStore()
      const callback = jest.fn()
      const unsub = store.dev_subscribe_store?.(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, jest.fn())
      const unsubAtomSecond = store.sub(countAtom, jest.fn())
      unsubAtom?.()
      expect(callback).toHaveBeenNthCalledWith(1, 'mount')
      expect(callback).toHaveBeenNthCalledWith(2, 'state')
      expect(callback).toHaveBeenNthCalledWith(3, 'sub')
      expect(callback).toHaveBeenNthCalledWith(4, 'sub')
      expect(callback).toHaveBeenNthCalledWith(5, 'unsub')
      expect(callback).toHaveBeenCalledTimes(5)
      unsub?.()
      unsubAtomSecond?.()
    })

    it('should call the unmount when atom is unsubscribed', () => {
      const store = createStore()
      const callback = jest.fn()
      const unsub = store.dev_subscribe_store?.(callback)
      const countAtom = atom(0)
      const unsubAtom = store.sub(countAtom, jest.fn())
      store.set(countAtom, 1)
      unsubAtom?.()
      expect(callback).toHaveBeenNthCalledWith(1, 'mount')
      expect(callback).toHaveBeenNthCalledWith(2, 'state')
      expect(callback).toHaveBeenNthCalledWith(3, 'sub')
      expect(callback).toHaveBeenNthCalledWith(4, 'state')
      expect(callback).toHaveBeenNthCalledWith(5, 'unmount')
      expect(callback).toHaveBeenNthCalledWith(6, 'unsub')
      expect(callback).toHaveBeenCalledTimes(6)
      unsub?.()
    })
  })
})

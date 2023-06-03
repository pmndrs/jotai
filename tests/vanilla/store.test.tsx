import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Getter } from 'jotai/vanilla'

it('should not fire on subscribe', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback1 = vi.fn()
  const callback2 = vi.fn()
  store.sub(countAtom, callback1)
  store.sub(countAtom, callback2)
  expect(callback1).not.toHaveBeenCalled()
  expect(callback2).not.toHaveBeenCalled()
})

it('should not fire subscription if primitive atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback = vi.fn()
  store.sub(countAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 0)
  expect(callback).toHaveBeenCalledTimes(calledTimes)
})

it('should not fire subscription if derived atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom) * 0)
  const callback = vi.fn()
  store.sub(derivedAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 1)
  expect(callback).toHaveBeenCalledTimes(calledTimes)
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
    // Comment this line to make the test pass
    store.get(derivedAtom)
  })
  const unsub = store.sub(anotherDerivedAtom, callback)
  unsub()
  unsubStore?.()
  const result = Array.from(store.dev_get_mounted_atoms?.() ?? [])
  expect(result).toEqual([])
})

it('should update async atom with delay (#1813)', async () => {
  const countAtom = atom(0)

  const resolve: (() => void)[] = []
  const delayedAtom = atom(async (get) => {
    const count = get(countAtom)
    await new Promise<void>((r) => resolve.push(r))
    return count
  })

  const store = createStore()
  store.get(delayedAtom)
  store.set(countAtom, 1)
  resolve.splice(0).forEach((fn) => fn())
  await new Promise<void>((r) => setTimeout(r)) // wait for a tick
  const promise = store.get(delayedAtom)
  resolve.splice(0).forEach((fn) => fn())
  expect(await promise).toBe(1)
})

it('should override a promise by setting', async () => {
  const store = createStore()
  const countAtom = atom(Promise.resolve(0))
  const infinitePending = new Promise<never>(() => {})
  store.set(countAtom, infinitePending)
  const promise = store.get(countAtom)
  store.set(countAtom, Promise.resolve(1))
  expect(await promise).toBe(1)
})

it('should update async atom with deps after await (#1905)', async () => {
  const countAtom = atom(0)
  const resolve: (() => void)[] = []
  const delayedAtom = atom(async (get) => {
    await new Promise<void>((r) => resolve.push(r))
    const count = get(countAtom)
    return count
  })
  const derivedAtom = atom(async (get) => {
    const count = await get(delayedAtom)
    return count
  })

  const store = createStore()
  let lastValue = store.get(derivedAtom)
  const unsub = store.sub(derivedAtom, () => {
    lastValue = store.get(derivedAtom)
  })
  store.set(countAtom, 1)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(1)
  store.set(countAtom, 2)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(2)
  store.set(countAtom, 3)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(3)
  unsub()
})

it('should not fire subscription when async atom promise is the same', async () => {
  const promise = Promise.resolve()
  const promiseAtom = atom(promise)
  const derivedGetter = vi.fn((get: Getter) => get(promiseAtom))
  const derivedAtom = atom(derivedGetter)

  const store = createStore()

  expect(derivedGetter).not.toHaveBeenCalled()

  const promiseListener = vi.fn()
  const promiseUnsub = store.sub(promiseAtom, promiseListener)
  const derivedListener = vi.fn()
  const derivedUnsub = store.sub(derivedAtom, derivedListener)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.get(promiseAtom)
  store.get(derivedAtom)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.set(promiseAtom, promise)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.set(promiseAtom, promise)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  promiseUnsub()
  derivedUnsub()
})

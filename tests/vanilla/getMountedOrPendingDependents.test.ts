import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'

describe('getMountedOrPendingDependents consistent behavior', () => {
  it('sub to asyncAtom -> syncAtom++', async () => {
    const store = createStore()
    const callback = vi.fn()
    const syncAtom = atom(0)
    const asyncAtom = atom((get) => {
      get(syncAtom)
      callback()
      return new Promise((res) => setTimeout(res))
    })

    const unsub = store.sub(asyncAtom, () => {})
    expect(callback).toHaveBeenCalledTimes(1)
    callback.mockClear()
    store.set(syncAtom, (v) => v + 1)
    expect(callback).toHaveBeenCalledTimes(1)
    callback.mockClear()
    unsub()
    expect(callback).toHaveBeenCalledTimes(0)
    store.set(syncAtom, (v) => v + 1)
    expect(callback).toHaveBeenCalledTimes(0)
  })

  it('sub to asyncAtom -> syncAtomWrapper -> syncAtom++', async () => {
    const store = createStore()
    const callback = vi.fn()
    const syncAtom = atom(0)
    const syncAtomWrapper = atom((get) => get(syncAtom))
    const asyncAtom = atom((get) => {
      callback()
      get(syncAtomWrapper)
      return new Promise((res) => setTimeout(res))
    })

    const unsub = store.sub(asyncAtom, () => {})
    expect(callback).toHaveBeenCalledTimes(1)
    callback.mockClear()
    store.set(syncAtom, (v) => v + 1)
    expect(callback).toHaveBeenCalledTimes(1)
    callback.mockClear()
    unsub()
    expect(callback).toHaveBeenCalledTimes(0)
    store.set(syncAtom, (v) => v + 1)
    expect(callback).toHaveBeenCalledTimes(0)
  })
})

it('pending asyncAtom -> syncAtom++', async () => {
  const store = createStore()
  const callback = vi.fn()
  const syncAtom = atom(0)
  const asyncAtom = atom((get) => {
    get(syncAtom)
    callback()
    return new Promise((res) => setTimeout(res))
  })

  store.get(asyncAtom)
  expect(callback).toHaveBeenCalledTimes(1)
  callback.mockClear()
  store.set(syncAtom, 1)
  expect(callback).toHaveBeenCalledTimes(0) // FAILS: received 1
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

describe('loadable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return fulfilled value of an already resolved async atom', async () => {
    const store = createStore()
    const asyncAtom = atom(
      new Promise<string>((resolve) =>
        setTimeout(() => resolve('concrete'), 100),
      ),
    )

    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'loading',
    })
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'hasData',
      data: 'concrete',
    })
  })

  it('should get the latest loadable state after the promise resolves', async () => {
    const store = createStore()
    const asyncAtom = atom(
      new Promise<void>((resolve) => setTimeout(() => resolve(), 100)),
    )
    const loadableAtom = loadable(asyncAtom)

    expect(store.get(loadableAtom)).toHaveProperty('state', 'loading')
    await vi.advanceTimersByTimeAsync(100)
    expect(store.get(loadableAtom)).toHaveProperty('state', 'hasData')
  })
})

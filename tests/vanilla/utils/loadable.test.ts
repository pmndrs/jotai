import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

let savedConsoleWarn: any

describe('loadable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    savedConsoleWarn = console.warn
    console.warn = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    console.warn = savedConsoleWarn
  })

  it('should return fulfilled value of an already resolved async atom', async () => {
    const store = createStore()
    const asyncAtom = atom(Promise.resolve('concrete'))

    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'loading',
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'hasData',
      data: 'concrete',
    })
  })

  it('should get the latest loadable state after the promise resolves', async () => {
    const store = createStore()
    const asyncAtom = atom(Promise.resolve())
    const loadableAtom = loadable(asyncAtom)

    expect(store.get(loadableAtom)).toHaveProperty('state', 'loading')
    await vi.advanceTimersByTimeAsync(0)
    expect(store.get(loadableAtom)).toHaveProperty('state', 'hasData')
  })

  // https://github.com/pmndrs/jotai/discussions/3208#discussioncomment-15431859
  it('[DEV-ONLY] should not call store.set during atom read', async () => {
    const store = createStore()
    const example = atom('Hello')
    store.get(example)
    const loadableAtom = loadable(example)
    vi.clearAllMocks()
    store.get(loadableAtom)
    expect(console.warn).not.toHaveBeenCalled()
  })
})

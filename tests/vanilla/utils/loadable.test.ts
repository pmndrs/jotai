import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

describe('loadable', () => {
  it('should return fulfilled value of an already resolved async atom', async () => {
    const store = createStore()
    const asyncAtom = atom(Promise.resolve('concrete'))

    expect(await store.get(asyncAtom)).toEqual('concrete')
    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'loading',
    })
    await new Promise((r) => setTimeout(r)) // wait for a tick
    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'hasData',
      data: 'concrete',
    })
  })

  it('should get the latest loadable state after the promise resolves', async () => {
    const delayPromise = new Promise((r) => setTimeout(r, 10))
    const store = createStore()
    const asyncAtom = atom(delayPromise)
    const loadableAtom = loadable(asyncAtom)

    expect(store.get(loadableAtom)).toEqual({
      state: 'loading',
    })

    await store.get(asyncAtom)

    expect(store.get(loadableAtom)).toEqual({
      state: 'hasData',
      data: undefined,
    })
  })
})

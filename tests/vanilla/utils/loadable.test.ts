import { describe, expect, it } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { loadable } from 'jotai/vanilla/utils'

describe('loadable', () => {
  it('should return fulfilled value of an already resolved async atom', async () => {
    const store = createStore()
    const asyncAtom = atom(Promise.resolve('concrete'))

    expect(await store.get(asyncAtom)).toEqual('concrete')
    expect(store.get(loadable(asyncAtom))).toEqual({
      state: 'hasData',
      data: 'concrete',
    })
  })
})

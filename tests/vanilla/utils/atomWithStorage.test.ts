import { describe, expect, it } from 'vitest'
import { createStore } from 'jotai/vanilla'
import { atomWithStorage, createJSONStorage } from 'jotai/vanilla/utils'

const testStringStorage = (() => {
  const map = new Map<string, string>()

  return {
    getItem(key: string) {
      return map.get(key) ?? null
    },

    removeItem(key: string) {
      map.delete(key)
    },

    setItem(key: string, newValue: string) {
      map.set(key, newValue)
    },
  }
})()

const testStorage = createJSONStorage(() => testStringStorage)

describe('atomWithStorage', () => {
  it('given getOnInit is true, initial value should be calculated on the first get (per store)', () => {
    const storeKey = 'a-key' as const
    const storeAlpha = createStore()
    const storeBeta = createStore()
    let store = storeAlpha

    // providing an initial value in the storage
    testStorage.setItem(storeKey, 'initial')

    const anAtom = atomWithStorage(storeKey, null, testStorage, {
      getOnInit: true,
    })

    expect(store.get(anAtom)).toEqual('initial')

    store.set(anAtom, 'next-value')

    expect(store.get(anAtom)).toEqual('next-value')

    // changing store, often used when logging out of the app to reset the state.
    store = storeBeta

    expect(store.get(anAtom)).toEqual('next-value')
  })
})

import { expect, it, vi } from 'vitest'
import { createStore } from 'jotai/vanilla'
import { atomWithLazy } from 'jotai/vanilla/utils'

it('initializes on first store get', async () => {
  const storeA = createStore()
  const storeB = createStore()

  let externalState = 'first'
  const initializer = vi.fn(() => externalState)
  const anAtom = atomWithLazy(initializer)

  expect(initializer).not.toHaveBeenCalled()
  expect(storeA.get(anAtom)).toEqual('first')
  expect(initializer).toHaveBeenCalledOnce()

  externalState = 'second'

  expect(storeA.get(anAtom)).toEqual('first')
  expect(initializer).toHaveBeenCalledOnce()
  expect(storeB.get(anAtom)).toEqual('second')
  expect(initializer).toHaveBeenCalledTimes(2)
})

it('is writable', async () => {
  const store = createStore()
  const anAtom = atomWithLazy(() => 0)

  store.set(anAtom, 123)

  expect(store.get(anAtom)).toEqual(123)
})

it('should work with a set state action', async () => {
  const store = createStore()
  const anAtom = atomWithLazy(() => 4)

  store.set(anAtom, (prev) => prev * prev)

  expect(store.get(anAtom)).toEqual(16)
})

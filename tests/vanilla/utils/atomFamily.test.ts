import { expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { atomFamily } from 'jotai/vanilla/utils'

it('should create atoms with different params', () => {
  const store = createStore()
  const aFamily = atomFamily((param: number) => atom(param))

  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
})

it('should remove atoms', () => {
  const store = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)

  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  aFamily.remove(2)
  initializeAtom.mockClear()
  expect(store.get(aFamily(1))).toEqual(1)
  expect(initializeAtom).toHaveBeenCalledTimes(0)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(initializeAtom).toHaveBeenCalledTimes(1)
})

it('should remove atoms with custom comparator', () => {
  const store = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom, (a, b) => a === b)

  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(store.get(aFamily(3))).toEqual(3)
  aFamily.remove(2)
  initializeAtom.mockClear()
  expect(store.get(aFamily(1))).toEqual(1)
  expect(initializeAtom).toHaveBeenCalledTimes(0)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(initializeAtom).toHaveBeenCalledTimes(1)
})

it('should remove atoms with custom shouldRemove', () => {
  const store = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily<number, Atom<number>>(initializeAtom)
  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(store.get(aFamily(3))).toEqual(3)
  aFamily.setShouldRemove((_createdAt, param) => param % 2 === 0)
  initializeAtom.mockClear()
  expect(store.get(aFamily(1))).toEqual(1)
  expect(initializeAtom).toHaveBeenCalledTimes(0)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(initializeAtom).toHaveBeenCalledTimes(1)
  expect(store.get(aFamily(3))).toEqual(3)
  expect(initializeAtom).toHaveBeenCalledTimes(1)
})

it('should notify listeners', () => {
  const aFamily = atomFamily((param: number) => atom(param))
  const listener = vi.fn(() => {})
  type Event = { type: 'CREATE' | 'REMOVE'; param: number; atom: Atom<number> }
  const unsubscribe = aFamily.unstable_listen(listener)
  const atom1 = aFamily(1)
  expect(listener).toHaveBeenCalledTimes(1)
  const eventCreate = listener.mock.calls[0]?.at(0) as unknown as Event
  if (!eventCreate) throw new Error('eventCreate is undefined')
  expect(eventCreate.type).toEqual('CREATE')
  expect(eventCreate.param).toEqual(1)
  expect(eventCreate.atom).toEqual(atom1)
  listener.mockClear()
  aFamily.remove(1)
  expect(listener).toHaveBeenCalledTimes(1)
  const eventRemove = listener.mock.calls[0]?.at(0) as unknown as Event
  expect(eventRemove.type).toEqual('REMOVE')
  expect(eventRemove.param).toEqual(1)
  expect(eventRemove.atom).toEqual(atom1)
  unsubscribe()
  listener.mockClear()
  aFamily(2)
  expect(listener).toHaveBeenCalledTimes(0)
})

it('should return all params', () => {
  const store = createStore()
  const aFamily = atomFamily((param: number) => atom(param))

  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(store.get(aFamily(3))).toEqual(3)
  expect(Array.from(aFamily.getParams())).toEqual([1, 2, 3])
})

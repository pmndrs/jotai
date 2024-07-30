import { expect, it, vi } from 'vitest'
import { Atom, atom, createStore } from 'jotai/vanilla'
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

it('should support instanceof', () => {
  const aFamilyA = atomFamily((param: number) => atom(param))
  const aFamilyB = atomFamily((param: number) => atom(param))
  expect(aFamilyA(1) instanceof aFamilyA).toEqual(true)
  expect(aFamilyA(2) instanceof aFamilyA).toEqual(true)
  expect(aFamilyA(1) instanceof aFamilyB).toEqual(false)
  expect(aFamilyA(1) instanceof atom).toEqual(false)
  expect(atom(2) instanceof aFamilyA).toEqual(false)
})

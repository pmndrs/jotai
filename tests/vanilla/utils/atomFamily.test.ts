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

it('should remove atoms when they are never subscribed', () => {
  const store = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)

  // Create atoms but don't subscribe to them
  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)

  // Remove atom 2 - should be removed immediately since it was never subscribed
  aFamily.remove(2)
  initializeAtom.mockClear()

  // Atom 1 should still exist
  expect(store.get(aFamily(1))).toEqual(1)
  expect(initializeAtom).toHaveBeenCalledTimes(0)

  // Atom 2 should be recreated since it was removed
  expect(store.get(aFamily(2))).toEqual(2)
  expect(initializeAtom).toHaveBeenCalledTimes(1)
})

it('should remove atoms with custom comparator when never subscribed', () => {
  const store = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom, (a, b) => a === b)

  // Create atoms but don't subscribe to them
  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(store.get(aFamily(3))).toEqual(3)

  // Remove atom 2 - should be removed immediately since it was never subscribed
  aFamily.remove(2)
  initializeAtom.mockClear()

  // Atoms 1 and 3 should still exist
  expect(store.get(aFamily(1))).toEqual(1)
  expect(initializeAtom).toHaveBeenCalledTimes(0)
  expect(store.get(aFamily(3))).toEqual(3)
  expect(initializeAtom).toHaveBeenCalledTimes(0)

  // Atom 2 should be recreated since it was removed
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

it('should notify listeners when atoms are removed', () => {
  const aFamily = atomFamily((param: number) => atom(param))
  const listener = vi.fn(() => {})
  type Event = { type: 'CREATE' | 'REMOVE'; param: number; atom: Atom<number> }
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atom - should trigger CREATE event
  const atom1 = aFamily(1)
  expect(listener).toHaveBeenCalledTimes(1)
  const eventCreate = (listener.mock.calls[0] as any)?.[0] as Event
  if (!eventCreate) throw new Error('eventCreate is undefined')
  expect(eventCreate.type).toEqual('CREATE')
  expect(eventCreate.param).toEqual(1)
  expect(eventCreate.atom).toEqual(atom1)

  // Remove atom that was never subscribed - should trigger REMOVE event immediately
  listener.mockClear()
  aFamily.remove(1)
  expect(listener).toHaveBeenCalledTimes(1)
  const eventRemove = (listener.mock.calls[0] as any)?.[0] as Event
  expect(eventRemove.type).toEqual('REMOVE')
  expect(eventRemove.param).toEqual(1)
  expect(eventRemove.atom).toEqual(atom1)

  // Create another atom after unsubscribing - should not trigger event
  unsubscribe()
  listener.mockClear()
  aFamily(2)
  expect(listener).toHaveBeenCalledTimes(0)
})

it('should notify listeners only when subscribed atoms are fully unmounted', () => {
  const store = createStore()
  const aFamily = atomFamily((param: number) => atom(param))
  const listener = vi.fn(() => {})
  type Event = { type: 'CREATE' | 'REMOVE'; param: number; atom: Atom<number> }
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create and subscribe to atom
  const atom1 = aFamily(1)
  expect(store.get(atom1)).toEqual(1)
  const unsub = store.sub(atom1, () => {})

  // Clear listener calls from creation
  listener.mockClear()

  // Remove atom - should NOT trigger REMOVE event yet because it's still subscribed
  aFamily.remove(1)
  expect(listener).toHaveBeenCalledTimes(0)

  // Unsubscribe - should NOW trigger REMOVE event
  unsub()
  expect(listener).toHaveBeenCalledTimes(1)
  const eventRemove = (listener.mock.calls[0] as any)?.[0] as Event
  expect(eventRemove.type).toEqual('REMOVE')
  expect(eventRemove.param).toEqual(1)
  expect(eventRemove.atom).toEqual(atom1)

  unsubscribe()
})

it('should return all params', () => {
  const store = createStore()
  const aFamily = atomFamily((param: number) => atom(param))

  expect(store.get(aFamily(1))).toEqual(1)
  expect(store.get(aFamily(2))).toEqual(2)
  expect(store.get(aFamily(3))).toEqual(3)
  expect(Array.from(aFamily.getParams())).toEqual([1, 2, 3])
})

it('should only remove atoms when unmounted from all stores', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atom and subscribe from both stores
  const atom1 = aFamily(1)
  expect(store1.get(atom1)).toEqual(1)
  expect(store2.get(atom1)).toEqual(1)

  const unsub1 = store1.sub(atom1, () => {})
  const unsub2 = store2.sub(atom1, () => {})

  // Mark atom for removal
  listener.mockClear()
  aFamily.remove(1)

  // Atom should not be removed yet because it's still mounted in both stores
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // Unsubscribe from first store
  unsub1()

  // Atom should still not be removed because it's still mounted in store2
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // Unsubscribe from second store
  unsub2()

  // Now atom should be removed since it's unmounted from all stores
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 1,
    atom: atom1,
  })
  expect(Array.from(aFamily.getParams())).toEqual([])

  unsubscribe()
})

it('should only remove atoms with setShouldRemove when unmounted from all stores', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily<number, Atom<number>>(initializeAtom)
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atoms and subscribe from both stores
  const atom1 = aFamily(1)
  const atom2 = aFamily(2)
  expect(store1.get(atom1)).toEqual(1)
  expect(store1.get(atom2)).toEqual(2)
  expect(store2.get(atom1)).toEqual(1)
  expect(store2.get(atom2)).toEqual(2)

  const unsub1_1 = store1.sub(atom1, () => {})
  const unsub1_2 = store1.sub(atom2, () => {})
  const unsub2_1 = store2.sub(atom1, () => {})
  const unsub2_2 = store2.sub(atom2, () => {})

  // Set shouldRemove to remove even-numbered params
  listener.mockClear()
  aFamily.setShouldRemove((_createdAt, param: number) => param % 2 === 0)

  // atom2 should not be removed yet because it's still mounted in both stores
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1, 2])

  // Unsubscribe atom2 from first store
  unsub1_2()

  // atom2 should still not be removed because it's still mounted in store2
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1, 2])

  // Unsubscribe atom2 from second store
  unsub2_2()

  // Now atom2 should be removed since it's unmounted from all stores
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 2,
    atom: atom2,
  })
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // atom1 should still be there since it doesn't match shouldRemove condition
  unsub1_1()
  unsub2_1()
  expect(listener).toHaveBeenCalledTimes(1) // No additional calls
  expect(Array.from(aFamily.getParams())).toEqual([1])

  unsubscribe()
})

it('should handle atoms that are never subscribed to', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atom but don't subscribe to it
  const atom1 = aFamily(1)
  expect(store1.get(atom1)).toEqual(1)
  expect(store2.get(atom1)).toEqual(1)

  // Mark atom for removal
  listener.mockClear()
  aFamily.remove(1)

  // Atom should be removed immediately since it was never subscribed to
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 1,
    atom: atom1,
  })
  expect(Array.from(aFamily.getParams())).toEqual([])

  unsubscribe()
})

it('should handle re-subscription after partial unmounting', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atom and subscribe from both stores
  const atom1 = aFamily(1)
  expect(store1.get(atom1)).toEqual(1)
  expect(store2.get(atom1)).toEqual(1)

  const unsub1 = store1.sub(atom1, () => {})
  const unsub2 = store2.sub(atom1, () => {})

  // Clear listener calls from creation
  listener.mockClear()

  // Mark atom for removal
  aFamily.remove(1)

  // Unsubscribe from first store
  unsub1()

  // Atom should still not be removed
  expect(listener).toHaveBeenCalledTimes(0)

  // Re-subscribe to first store
  const unsub1_new = store1.sub(atom1, () => {})

  // Unsubscribe from second store
  unsub2()

  // Atom should still not be removed because it's re-subscribed to store1
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // Finally unsubscribe from store1
  unsub1_new()

  // Now atom should be removed
  expect(listener).toHaveBeenCalledTimes(1)
  expect(Array.from(aFamily.getParams())).toEqual([])

  unsubscribe()
})

it('should handle multiple atoms with mixed subscription states', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: number) => atom(param))
  const aFamily = atomFamily(initializeAtom)
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create multiple atoms with different subscription patterns
  const atom1 = aFamily(1) // Will be subscribed to both stores
  const atom2 = aFamily(2) // Will be subscribed to store1 only
  const atom3 = aFamily(3) // Will not be subscribed

  expect(store1.get(atom1)).toEqual(1)
  expect(store1.get(atom2)).toEqual(2)
  expect(store1.get(atom3)).toEqual(3)
  expect(store2.get(atom1)).toEqual(1)

  const unsub1_1 = store1.sub(atom1, () => {})
  const unsub1_2 = store1.sub(atom2, () => {})
  const unsub2_1 = store2.sub(atom1, () => {})

  // Mark all atoms for removal
  listener.mockClear()
  aFamily.remove(1)
  aFamily.remove(2)
  aFamily.remove(3)

  // atom3 should be removed immediately (never subscribed)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 3,
    atom: atom3,
  })
  expect(Array.from(aFamily.getParams())).toEqual([1, 2])

  // Unsubscribe atom2 from store1
  listener.mockClear()
  unsub1_2()

  // atom2 should be removed (only subscribed to store1)
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 2,
    atom: atom2,
  })
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // Unsubscribe atom1 from store1
  listener.mockClear()
  unsub1_1()

  // atom1 should not be removed yet (still subscribed to store2)
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([1])

  // Unsubscribe atom1 from store2
  unsub2_1()

  // Now atom1 should be removed
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: 1,
    atom: atom1,
  })
  expect(Array.from(aFamily.getParams())).toEqual([])

  unsubscribe()
})

it('should handle multi-store removal with custom comparator', () => {
  const store1 = createStore()
  const store2 = createStore()
  const initializeAtom = vi.fn((param: { id: number }) => atom(param.id))
  const aFamily = atomFamily<{ id: number }, Atom<number>>(
    initializeAtom,
    (a: { id: number }, b: { id: number }) => a.id === b.id,
  )
  const listener = vi.fn()
  const unsubscribe = aFamily.unstable_listen(listener)

  // Create atom with object param and subscribe from both stores
  const param1 = { id: 1 }
  const param1_duplicate = { id: 1 } // Different object, same id
  const atom1 = aFamily(param1)

  expect(store1.get(atom1)).toEqual(1)
  expect(store2.get(atom1)).toEqual(1)

  // Verify same atom is returned for equivalent params
  expect(aFamily(param1_duplicate)).toBe(atom1)

  const unsub1 = store1.sub(atom1, () => {})
  const unsub2 = store2.sub(atom1, () => {})

  // Mark atom for removal using equivalent param
  listener.mockClear()
  aFamily.remove(param1_duplicate)

  // Atom should not be removed yet because it's still mounted in both stores
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([param1])

  // Unsubscribe from first store
  unsub1()

  // Atom should still not be removed
  expect(listener).toHaveBeenCalledTimes(0)
  expect(Array.from(aFamily.getParams())).toEqual([param1])

  // Unsubscribe from second store
  unsub2()

  // Now atom should be removed
  expect(listener).toHaveBeenCalledTimes(1)
  expect(listener.mock.calls[0]?.[0]).toEqual({
    type: 'REMOVE',
    param: param1,
    atom: atom1,
  })
  expect(Array.from(aFamily.getParams())).toEqual([])

  unsubscribe()
})

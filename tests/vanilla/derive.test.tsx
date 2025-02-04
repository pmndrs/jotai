import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import {
  INTERNAL_buildStore,
  INTERNAL_createBuildingBlocksRev1 as INTERNAL_createBuildingBlocks,
  INTERNAL_createStoreArgsRev1 as INTERNAL_createStoreArgs,
  INTERNAL_getStoreArgsRev1 as INTERNAL_getStoreArgs,
} from 'jotai/vanilla/internals'

type AtomStateMapType = ReturnType<typeof INTERNAL_getStoreArgs>[0]

const deriveStore = (
  store: ReturnType<typeof createStore>,
  enhanceAtomStateMap: (atomStateMap: AtomStateMapType) => AtomStateMapType,
): ReturnType<typeof createStore> => {
  const storeArgs = INTERNAL_getStoreArgs(store)
  const atomStateMap = storeArgs[0]
  const newStoreArgs = INTERNAL_createStoreArgs(
    enhanceAtomStateMap(atomStateMap),
  )
  const buildingBlocks = INTERNAL_createBuildingBlocks(
    newStoreArgs,
    () => derivedStore,
  )
  const derivedStore = INTERNAL_buildStore(newStoreArgs, buildingBlocks)
  return derivedStore
}

describe('deriveStore for scoping atoms', () => {
  /**
   * a
   * S1[a]: a1
   */
  it('primitive atom', () => {
    const a = atom('a')
    a.onMount = (setSelf) => setSelf((v) => v + ':mounted')
    const scopedAtoms = new Set<Atom<unknown>>([a])

    const store = createStore()
    const derivedStore = deriveStore(store, (atomStateMap) => {
      const scopedAtomStateMap = new WeakMap()
      return {
        get: (atom) => {
          if (scopedAtoms.has(atom)) {
            return scopedAtomStateMap.get(atom)
          }
          return atomStateMap.get(atom)
        },
        set: (atom, atomState) => {
          if (scopedAtoms.has(atom)) {
            scopedAtomStateMap.set(atom, atomState)
          } else {
            atomStateMap.set(atom, atomState)
          }
        },
      }
    })

    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a')

    derivedStore.sub(a, vi.fn())
    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a:mounted')

    derivedStore.set(a, (v) => v + ':updated')
    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a:mounted:updated')
  })

  /**
   * a, b, c(a + b)
   * S1[a]: a1, b0, c0(a1 + b0)
   */
  it('derived atom (scoping primitive)', () => {
    const a = atom('a')
    const b = atom('b')
    const c = atom((get) => get(a) + get(b))
    const scopedAtoms = new Set<Atom<unknown>>([a])

    const store = createStore()
    const derivedStore = deriveStore(store, (atomStateMap) => {
      const scopedAtomStateMap = new WeakMap()
      return {
        get: (atom) => {
          if (scopedAtoms.has(atom)) {
            return scopedAtomStateMap.get(atom)
          }
          return atomStateMap.get(atom)
        },
        set: (atom, atomState) => {
          if (scopedAtoms.has(atom)) {
            scopedAtomStateMap.set(atom, atomState)
          } else {
            atomStateMap.set(atom, atomState)
          }
        },
      }
    })

    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('ab')

    derivedStore.set(a, 'a2')
    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('a2b')
  })

  /**
   * a, b(a)
   * S1[a]: a1, b0(a1)
   */
  it('derived atom with subscribe', () => {
    const a = atom('a')
    const b = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const scopedAtoms = new Set<Atom<unknown>>([a])

    function makeStores() {
      const store = createStore()
      const derivedStore = deriveStore(store, (atomStateMap) => {
        const scopedAtomStateMap = new WeakMap()
        return {
          get: (atom) => {
            if (scopedAtoms.has(atom)) {
              return scopedAtomStateMap.get(atom)
            }
            return atomStateMap.get(atom)
          },
          set: (atom, atomState) => {
            if (scopedAtoms.has(atom)) {
              scopedAtomStateMap.set(atom, atomState)
            } else {
              atomStateMap.set(atom, atomState)
            }
          },
        }
      })
      expect(store.get(b)).toBe('a')
      expect(derivedStore.get(b)).toBe('a')
      return { store, derivedStore }
    }

    /**
     * Ba[ ]: a0, b0(a0)
     * S1[a]: a1, b0(a1)
     */
    {
      const { store, derivedStore } = makeStores()
      store.set(b, '*')
      expect(store.get(b)).toBe('*')
      expect(derivedStore.get(b)).toBe('a')
    }
    {
      const { store, derivedStore } = makeStores()
      derivedStore.set(b, '*')
      expect(store.get(b)).toBe('a')
      expect(derivedStore.get(b)).toBe('*')
    }
    {
      const { store, derivedStore } = makeStores()
      const storeCallback = vi.fn()
      const derivedCallback = vi.fn()
      store.sub(b, storeCallback)
      derivedStore.sub(b, derivedCallback)
      store.set(b, '*')
      expect(store.get(b)).toBe('*')
      //expect(derivedStore.get(b)).toBe('a') // FIXME: received '*'
      expect(storeCallback).toHaveBeenCalledTimes(1)
      //expect(derivedCallback).toHaveBeenCalledTimes(0) // FIXME: received 1
    }
    {
      const { store, derivedStore } = makeStores()
      const storeCallback = vi.fn()
      const derivedCallback = vi.fn()
      store.sub(b, storeCallback)
      derivedStore.sub(b, derivedCallback)
      derivedStore.set(b, '*')
      //expect(store.get(b)).toBe('a') // FIXME: received '*'
      expect(derivedStore.get(b)).toBe('*')
      expect(storeCallback).toHaveBeenCalledTimes(0)
      expect(derivedCallback).toHaveBeenCalledTimes(1)
    }
  })
})

it('should pass the correct store instance to the atom initializer', () => {
  expect.assertions(2)
  const baseStore = createStore()
  const derivedStore = deriveStore(baseStore, (atomStateMap) => {
    const initializedAtoms = new WeakSet()
    return {
      get: (atom) => {
        if (!initializedAtoms.has(atom)) {
          return undefined
        }
        return atomStateMap.get(atom)
      },
      set: (atom, atomState) => {
        initializedAtoms.add(atom)
        atomStateMap.set(atom, atomState)
      },
    }
  })
  const a = atom(null)
  a.unstable_onInit = (store) => {
    expect(store).toBe(baseStore)
  }
  baseStore.get(a)
  a.unstable_onInit = (store) => {
    expect(store).toBe(derivedStore)
  }
  derivedStore.get(a)
})

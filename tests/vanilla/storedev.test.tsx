import { describe, expect, it, vi } from 'vitest'
import { atom } from 'jotai/vanilla'
import type { Atom, WritableAtom } from 'jotai/vanilla'
import {
  INTERNAL_buildStoreRev2 as INTERNAL_buildStore,
  INTERNAL_initializeStoreHooks,
} from 'jotai/vanilla/internals'
import type {
  INTERNAL_AtomState,
  INTERNAL_BuildingBlocks,
  INTERNAL_Store,
} from 'jotai/vanilla/internals'

type DevStore = {
  get_internal_weak_map: () => {
    get: (atom: Atom<unknown>) => INTERNAL_AtomState | undefined
  }
  get_mounted_atoms: () => Set<Atom<unknown>>
  restore_atoms: (values: Iterable<readonly [Atom<unknown>, unknown]>) => void
}

const createDevStore = (): INTERNAL_Store & DevStore => {
  let inRestoreAtom = 0
  const storeHooks = INTERNAL_initializeStoreHooks({})
  const atomStateMap = new WeakMap()
  const mountedAtoms = new WeakMap()
  const store = INTERNAL_buildStore([
    atomStateMap,
    mountedAtoms,
    undefined,
    undefined,
    undefined,
    undefined,
    storeHooks,
    undefined,
    (atom, get, set, ...args) => {
      if (inRestoreAtom) {
        return set(atom, ...(args as any))
      }
      return atom.write(get, set, ...(args as any))
    },
  ])
  const debugMountedAtoms = new Set<Atom<unknown>>()
  storeHooks.m.add(undefined, (atom) => {
    debugMountedAtoms.add(atom)
    const atomState = atomStateMap.get(atom)
    // For DevStoreRev4 compatibility
    ;(atomState as any).m = mountedAtoms.get(atom)
  })
  storeHooks.u.add(undefined, (atom) => {
    debugMountedAtoms.delete(atom)
    const atomState = atomStateMap.get(atom)
    // For DevStoreRev4 compatibility
    delete (atomState as any).m
  })
  const devStore: DevStore = {
    // store dev methods (these are tentative and subject to change without notice)
    get_internal_weak_map: () => atomStateMap,
    get_mounted_atoms: () => debugMountedAtoms,
    restore_atoms: (values) => {
      const restoreAtom: WritableAtom<null, [], void> = {
        read: () => null,
        write: (_get, set) => {
          ++inRestoreAtom
          try {
            for (const [atom, value] of values) {
              if ('init' in atom) {
                set(atom as never, value)
              }
            }
          } finally {
            --inRestoreAtom
          }
        },
      }
      store.set(restoreAtom)
    },
  }
  return Object.assign(store, devStore)
}

describe('dev-only methods', () => {
  it('should get atom value', () => {
    const store = createDevStore()
    const countAtom = atom(0)
    store.set(countAtom, 1)
    const weakMap = store.get_internal_weak_map()
    expect(weakMap.get(countAtom)?.v).toEqual(1)
  })

  it('should restore atoms and its dependencies correctly', () => {
    const store = createDevStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    store.set(countAtom, 1)
    store.restore_atoms([[countAtom, 2]])
    expect(store.get(countAtom)).toBe(2)
    expect(store.get?.(derivedAtom)).toBe(4)
  })

  it('should restore atoms and call store listeners correctly', () => {
    const store = createDevStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const countCb = vi.fn()
    const derivedCb = vi.fn()
    store.set(countAtom, 2)
    const unsubCount = store.sub(countAtom, countCb)
    const unsubDerived = store.sub(derivedAtom, derivedCb)
    store.restore_atoms([
      [countAtom, 1],
      [derivedAtom, 2],
    ])

    expect(countCb).toHaveBeenCalled()
    expect(derivedCb).toHaveBeenCalled()
    unsubCount()
    unsubDerived()
  })

  it('should return all the mounted atoms correctly', () => {
    const store = createDevStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)
    const result = store.get_mounted_atoms()
    expect(
      Array.from(result)
        .sort((a, b) => Object.keys(a).length - Object.keys(b).length)
        .map((item) => {
          const { debugLabel: _, ...rest } = item
          return rest
        }),
    ).toStrictEqual([
      { toString: expect.any(Function), read: expect.any(Function) },
      {
        toString: expect.any(Function),
        init: 0,
        read: expect.any(Function),
        write: expect.any(Function),
      },
    ])
    unsub()
  })

  it("should return all the mounted atoms correctly after they're unsubscribed", () => {
    const store = createDevStore()
    const countAtom = atom(0)
    const derivedAtom = atom((get) => get(countAtom) * 2)
    const unsub = store.sub(derivedAtom, vi.fn())
    store.set(countAtom, 1)
    unsub()
    const result = store.get_mounted_atoms()
    expect(Array.from(result)).toStrictEqual([])
  })

  it('should restore atoms with custom write function', () => {
    const store = createDevStore()
    const countAtom = atom(0, () => {})
    store.restore_atoms([[countAtom, 1]])
    expect(store.get(countAtom)).toBe(1)
  })
})

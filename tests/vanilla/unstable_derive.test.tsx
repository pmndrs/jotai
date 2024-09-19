import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

describe('unstable_derive for scoping atoms', () => {
  /**
   * a
   * S1[a]: a1
   */
  it('primitive atom', async () => {
    const a = atom('a')
    a.onMount = (setSelf) => setSelf((v) => v + ':mounted')
    const scopedAtoms = new Set<Atom<unknown>>([a])

    const store = createStore()
    const derivedStore = store.unstable_derive(
      (getAtomState, atomRead, atomWrite) => {
        const scopedAtomStateMap = new WeakMap()
        return [
          (atom, originAtomState) => {
            if (scopedAtoms.has(atom)) {
              let atomState = scopedAtomStateMap.get(atom)
              if (!atomState) {
                atomState = { d: new Map(), p: new Set(), n: 0 }
                scopedAtomStateMap.set(atom, atomState)
              }
              return atomState
            }
            return getAtomState(atom, originAtomState)
          },
          atomRead,
          atomWrite,
        ]
      },
    )

    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a')

    derivedStore.sub(a, vi.fn())
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a:mounted')

    derivedStore.set(a, (v) => v + ':updated')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a')
    expect(derivedStore.get(a)).toBe('a:mounted:updated')
  })

  /**
   * a, b, c(a + b)
   * S1[a]: a1, b0, c0(a1 + b0)
   */
  it('derived atom (scoping primitive)', async () => {
    const a = atom('a')
    const b = atom('b')
    const c = atom((get) => get(a) + get(b))
    const scopedAtoms = new Set<Atom<unknown>>([a])

    const store = createStore()
    const derivedStore = store.unstable_derive(
      (getAtomState, atomRead, atomWrite) => {
        const scopedAtomStateMap = new WeakMap()
        return [
          (atom, originAtomState) => {
            if (scopedAtoms.has(atom)) {
              let atomState = scopedAtomStateMap.get(atom)
              if (!atomState) {
                atomState = { d: new Map(), p: new Set(), n: 0 }
                scopedAtomStateMap.set(atom, atomState)
              }
              return atomState
            }
            return getAtomState(atom, originAtomState)
          },
          atomRead,
          atomWrite,
        ]
      },
    )

    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('ab')

    derivedStore.set(a, 'a2')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('a2b')
  })

  /**
   * a, b(a)
   * S1[b]: a0, b1(a1)
   */
  it('derived atom (scoping derived)', async () => {
    const a = atom('a')
    const b = atom(
      (get) => get(a),
      (_get, set, v: string) => {
        set(a, v)
      },
    )
    const scopedAtoms = new Set<Atom<unknown>>([b])

    const store = createStore()
    const derivedStore = store.unstable_derive(
      (getAtomState, atomRead, atomWrite) => {
        const scopedAtomStateMap = new WeakMap()
        const scopedAtomStateSet = new WeakSet()
        return [
          (atom, originAtomState) => {
            if (
              scopedAtomStateSet.has(originAtomState as never) ||
              scopedAtoms.has(atom)
            ) {
              let atomState = scopedAtomStateMap.get(atom)
              if (!atomState) {
                atomState = { d: new Map(), p: new Set(), n: 0 }
                scopedAtomStateMap.set(atom, atomState)
                scopedAtomStateSet.add(atomState)
              }
              return atomState
            }
            return getAtomState(atom, originAtomState)
          },
          atomRead,
          atomWrite,
        ]
      },
    )

    expect(store.get(a)).toBe('a')
    expect(store.get(b)).toBe('a')
    expect(derivedStore.get(a)).toBe('a')
    expect(derivedStore.get(b)).toBe('a')

    store.set(a, 'a2')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a2')
    expect(store.get(b)).toBe('a2')
    expect(derivedStore.get(a)).toBe('a2')
    expect(derivedStore.get(b)).toBe('a')

    store.set(b, 'a3')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a3')
    expect(store.get(b)).toBe('a3')
    expect(derivedStore.get(a)).toBe('a3')
    expect(derivedStore.get(b)).toBe('a')

    derivedStore.set(a, 'a4')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a4')
    expect(store.get(b)).toBe('a4')
    expect(derivedStore.get(a)).toBe('a4')
    expect(derivedStore.get(b)).toBe('a')

    derivedStore.set(b, 'a5')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(a)).toBe('a4')
    expect(store.get(b)).toBe('a4')
    expect(derivedStore.get(a)).toBe('a4')
    expect(derivedStore.get(b)).toBe('a5')
  })

  /**
   * a, b, c(a), d(c), e(d + b)
   * S1[d]: a0, b0, c0(a0), d1(c1(a1)), e0(d1(c1(a1)) + b0)
   */
  it('derived atom (scoping derived chain)', async () => {
    const a = atom('a')
    const b = atom('b')
    const c = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const d = atom(
      (get) => get(c),
      (_get, set, v: string) => set(c, v),
    )
    const e = atom(
      (get) => get(d) + get(b),
      (_get, set, av: string, bv: string) => {
        set(d, av)
        set(b, bv)
      },
    )
    const scopedAtoms = new Set<Atom<unknown>>([d])

    function makeStores() {
      const baseStore = createStore()
      const deriStore = baseStore.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                scopedAtoms.has(atom)
              ) {
                let atomState = scopedAtomStateMap.get(atom)
                if (!atomState) {
                  atomState = { d: new Map(), p: new Set(), n: 0 }
                  scopedAtomStateMap.set(atom, atomState)
                  scopedAtomStateSet.add(atomState)
                }
                return atomState
              }
              return getAtomState(atom, originAtomState)
            },
            atomRead,
            atomWrite,
          ]
        },
      )
      expect(getAtoms(baseStore)).toEqual(['a', 'b', 'a', 'a', 'ab'])
      expect(getAtoms(deriStore)).toEqual(['a', 'b', 'a', 'a', 'ab'])
      return { baseStore, deriStore }
    }
    type Store = ReturnType<typeof createStore>
    function getAtoms(store: Store) {
      return [
        store.get(a),
        store.get(b),
        store.get(c),
        store.get(d),
        store.get(e),
      ]
    }

    /**
     * base[d]: a0, b0, c0(a0), d0(c0(a0)), e0(d0(c0(a0)) + b0)
     * deri[d]: a0, b0, c0(a0), d1(c1(a1)), e0(d1(c1(a1)) + b0)
     */
    {
      // UPDATE a0
      // NOCHGE b0 and a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['*', 'b', '*', '*', '*b'])
      expect(getAtoms(deriStore)).toEqual(['*', 'b', '*', 'a', 'ab'])
    }
    {
      // UPDATE b0
      // NOCHGE a0 and a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['a', '*', 'a', 'a', 'a*'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', 'a', 'a', 'a*'])
    }
    {
      // UPDATE c0, c0 -> a0
      // NOCHGE b0 and a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(c, '*')
      expect(getAtoms(baseStore)).toEqual(['*', 'b', '*', '*', '*b'])
      expect(getAtoms(deriStore)).toEqual(['*', 'b', '*', 'a', 'ab'])
    }
    {
      // UPDATE d0, d0 -> c0 -> a0
      // NOCHGE b0 and a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(d, '*')
      expect(getAtoms(baseStore)).toEqual(['*', 'b', '*', '*', '*b'])
      expect(getAtoms(deriStore)).toEqual(['*', 'b', '*', 'a', 'ab'])
    }
    {
      // UPDATE e0, e0 -> d0 -> c0 -> a0
      //             └--------------> b0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(e, '*', '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '**'])
      expect(getAtoms(deriStore)).toEqual(['*', '*', '*', 'a', 'a*'])
    }
    {
      // UPDATE a0
      // NOCHGE b0 and a1
      const { baseStore, deriStore } = makeStores()
      deriStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['*', 'b', '*', '*', '*b'])
      expect(getAtoms(deriStore)).toEqual(['*', 'b', '*', 'a', 'ab'])
    }
    {
      // UPDATE b0
      // NOCHGE a0 and a1
      const { baseStore, deriStore } = makeStores()
      deriStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['a', '*', 'a', 'a', 'a*'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', 'a', 'a', 'a*'])
    }
    {
      // UPDATE c0, c0 -> a0
      // NOCHGE b0 and a1
      const { baseStore, deriStore } = makeStores()
      deriStore.set(c, '*')
      expect(getAtoms(baseStore)).toEqual(['*', 'b', '*', '*', '*b'])
      expect(getAtoms(deriStore)).toEqual(['*', 'b', '*', 'a', 'ab'])
    }
    {
      // UPDATE d1, d1 -> c1 -> a1
      // NOCHGE b0 and a0
      const { baseStore, deriStore } = makeStores()
      deriStore.set(d, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'b', 'a', 'a', 'ab'])
      expect(getAtoms(deriStore)).toEqual(['a', 'b', 'a', '*', '*b'])
    }
    {
      // UPDATE e0, e0 -> d1 -> c1 -> a1
      //             └--------------> b0
      // NOCHGE a0
      const { baseStore, deriStore } = makeStores()
      deriStore.set(e, '*', '*')
      expect(getAtoms(baseStore)).toEqual(['a', '*', 'a', 'a', 'a*'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', 'a', '*', '**'])
    }
  })
})

import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

describe('unstable_derive for scoping atoms', () => {
  /**
   * a
   * S1[a]: a1
   */
  it('primitive atom', () => {
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
    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('a2b')
  })

  /**
   * a, b(a)
   * S1[b]: a0, b1(a1)
   */
  it('derived atom (scoping derived)', () => {
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
    expect(store.get(a)).toBe('a2')
    expect(store.get(b)).toBe('a2')
    expect(derivedStore.get(a)).toBe('a2')
    expect(derivedStore.get(b)).toBe('a')

    store.set(b, 'a3')
    expect(store.get(a)).toBe('a3')
    expect(store.get(b)).toBe('a3')
    expect(derivedStore.get(a)).toBe('a3')
    expect(derivedStore.get(b)).toBe('a')

    derivedStore.set(a, 'a4')
    expect(store.get(a)).toBe('a4')
    expect(store.get(b)).toBe('a4')
    expect(derivedStore.get(a)).toBe('a4')
    expect(derivedStore.get(b)).toBe('a')

    derivedStore.set(b, 'a5')
    expect(store.get(a)).toBe('a4')
    expect(store.get(b)).toBe('a4')
    expect(derivedStore.get(a)).toBe('a4')
    expect(derivedStore.get(b)).toBe('a5')
  })

  /**
   * a, b, c(a), d(c), e(d + b)
   * S1[d]: a0, b0, c0(a0), d1(c1(a1)), e0(d1(c1(a1)) + b0)
   */
  it('derived atom (scoping derived chain)', () => {
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
     * base[ ]: a0, b0, c0(a0), d0(c0(a0)), e0(d0(c0(a0)) + b0)
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

  /**
   * a, b(a), c(a), d(a)
   * S1[b, c]: a0, b1(a1), c1(a1), d0(a0)
   */
  it('derived atom shares same implicit', () => {
    const a = atom('a')
    const b = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const c = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const d = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const scopedAtoms = new Set<Atom<unknown>>([b, c])

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
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', 'a', 'a'])
      return { baseStore, deriStore }
    }
    type Store = ReturnType<typeof createStore>
    function getAtoms(store: Store) {
      return [store.get(a), store.get(b), store.get(c), store.get(d)]
    }

    /**
     * base[    ]: a0, b0(a0), c0(a0), d0(a0), '*'
     * deri[b, c]: a0, b0(a0), c1(a1), d0(a0), '*'
     */
    {
      // UPDATE a0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', 'a', 'a', '*'])
    }
    {
      // UPDATE b0, b0 -> a0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', 'a', 'a', '*'])
    }
    {
      // UPDATE c0, c0 -> a0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      baseStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', 'a', 'a', '*'])
    }
    {
      // UPDATE a0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      deriStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', 'a', 'a', '*'])
    }
    {
      // UPDATE b0, b0 -> a0
      // NOCHGE a1
      const { baseStore, deriStore } = makeStores()
      deriStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', '*', 'a'])
    }
    {
      // UPDATE c1, c1 -> a1
      // NOCHGE a0
      const { baseStore, deriStore } = makeStores()
      deriStore.set(c, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', '*', 'a'])
    }
  })

  /**
   * a, b, c(a + b)
   * S1[a]: a1, b0, c0(a1 + b0)
   * S2[ ]: a1, b0, c0(a1 + b0)
   */
  it('inherited atoms', () => {
    const a = atom('a')
    const b = atom('b')
    const c = atom((get) => get(a) + get(b))

    function makeStores() {
      const s1 = new Set<Atom<unknown>>([a])
      const s2 = new Set<Atom<unknown>>([])
      const baStore = createStore()
      const s1Store = baStore.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                s1.has(atom)
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
      const s2Store = s1Store.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                s2.has(atom)
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
      expect(getAtoms(baStore)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s1Store)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', 'b', 'ab'])
      return { baStore, s1Store, s2Store }
    }
    type Store = ReturnType<typeof createStore>
    function getAtoms(store: Store) {
      return [store.get(a), store.get(b), store.get(c)]
    }

    /**
     * BA[ ]: a0, b0, c0(a0 + b0)
     * S1[a]: a1, b0, c0(a1 + b0)
     * S2[ ]: a1, b0, c0(a1 + b0)
     */
    {
      // UPDATE a0
      // NOCHGE a1, b0
      const { baStore, s1Store, s2Store } = makeStores()
      baStore.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['*', 'b', '*b'])
      expect(getAtoms(s1Store)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', 'b', 'ab'])
    }
    {
      // UPDATE b0
      // NOCHGE a0, a1
      const { baStore, s1Store, s2Store } = makeStores()
      baStore.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'a*'])
    }
    {
      // UPDATE a1
      // NOCHGE a0, b0
      const { baStore, s1Store, s2Store } = makeStores()
      s1Store.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s1Store)).toEqual(['*', 'b', '*b'])
      expect(getAtoms(s2Store)).toEqual(['*', 'b', '*b'])
    }
    {
      // UPDATE b0
      // NOCHGE a0, a1
      const { baStore, s1Store, s2Store } = makeStores()
      s1Store.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'a*'])
    }
    {
      // UPDATE a1
      // NOCHGE a0, b0
      const { baStore, s1Store, s2Store } = makeStores()
      s2Store.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s1Store)).toEqual(['*', 'b', '*b'])
      expect(getAtoms(s2Store)).toEqual(['*', 'b', '*b'])
    }
    {
      // UPDATE b0
      // NOCHGE a0, a1
      const { baStore, s1Store, s2Store } = makeStores()
      s2Store.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'a*'])
    }
  })

  /**
   * a, b, c(a + b)
   * S1[c]: a0, b0, c1(a1 + b1)
   * S2[a]: a0, b0, c1(a2 + b1)
   */
  it('inherited atoms use explicit in current scope', () => {
    const a = atom('a')
    a.debugLabel = 'a'
    const b = atom('b')
    b.debugLabel = 'b'
    const c = atom((get) => get(a) + get(b))
    c.debugLabel = 'c'
    const s1 = new Set<Atom<unknown>>([c])
    const s2 = new Set<Atom<unknown>>([a])

    function makeStores() {
      const baStore = createStore()
      const s1Store = baStore.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                s1.has(atom)
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
      const s2Store = s1Store.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                s2.has(atom)
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
      expect(getAtoms(baStore)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s1Store)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', 'b', 'ab'])
      return { baStore, s1Store, s2Store }
    }

    type Store = ReturnType<typeof createStore>
    function getAtoms(store: Store) {
      return [
        store.get(a),
        store.get(b),
        store.get(c), //
      ]
    }

    /**
     * Ba[ ]: a0, b0, c0(a0 + b0)
     * S1[c]: a0, b0, c1(a1 + b1)
     * S2[a]: a2, b0, c1(a2 + b1)
     */
    {
      // UPDATE a0
      // NOCHGE b0, a1, b1, a2
      const { baStore, s1Store, s2Store } = makeStores()
      baStore.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['*', 'b', '*b'])
      expect(getAtoms(s1Store)).toEqual(['*', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', 'b', 'ab'])
    }
    {
      // UPDATE a0
      // NOCHGE b0, a1, b1, a2
      const { baStore, s1Store, s2Store } = makeStores()
      s1Store.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['*', 'b', '*b'])
      expect(getAtoms(s1Store)).toEqual(['*', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', 'b', 'ab'])
    }
    {
      // UPDATE a2
      // NOCHGE a0, b0, a1, b1
      const { baStore, s1Store, s2Store } = makeStores()
      s2Store.set(a, '*')
      expect(getAtoms(baStore)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s1Store)).toEqual(['a', 'b', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['*', 'b', '*b'])
    }
    /**
     * Ba[ ]: a0, b0, c0(a0 + b0)
     * S1[c]: a0, b0, c1(a1 + b1)
     * S2[a]: a2, b0, c1(a2 + b1)
     */
    {
      // UPDATE b0
      // NOCHGE a0, a1, b1, a2
      const { baStore, s1Store, s2Store } = makeStores()
      baStore.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*']) // ['a', '*', 'a*']
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'ab']) // ['a', '*', 'ab']
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'ab']) // ['a', '*', 'a*']
    }
    {
      // UPDATE b0
      // NOCHGE a0, a1, b1, a2
      const { baStore, s1Store, s2Store } = makeStores()
      s1Store.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'ab'])
    }
    {
      // UPDATE b0
      // NOCHGE a0, a1, b1, a2
      const { baStore, s1Store, s2Store } = makeStores()
      s2Store.set(b, '*')
      expect(getAtoms(baStore)).toEqual(['a', '*', 'a*'])
      expect(getAtoms(s1Store)).toEqual(['a', '*', 'ab'])
      expect(getAtoms(s2Store)).toEqual(['a', '*', 'ab'])
    }
  })

  /**
   * a, b(a), c(b), d(c), e(d)
   * S1[a]: a1, b0(a1), c0(b0(a1)), d0(c0(b0(a1))), e0(d0(c0(b0(a1))))
   * S1[b]: a0, b1(a1), c0(b1(a1)), d0(c0(b1(a1))), e0(d0(c0(b1(a1))))
   * S1[c]: a0, b0(a0), c1(b1(a1)), d0(c1(b1(a1))), e0(d0(c1(b1(a1))))
   * S1[d]: a0, b0(a0), c0(b0(a0)), d1(c1(b1(a1))), e0(d1(c1(b1(a1))))
   * S1[e]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e1(d1(c1(b1(a1))))
   */
  it('uses implicit at any distance', () => {
    const a = atom('a')
    const b = atom(
      (get) => get(a),
      (_get, set, v: string) => set(a, v),
    )
    const c = atom(
      (get) => get(b),
      (_get, set, v: string) => set(b, v),
    )
    const d = atom(
      (get) => get(c),
      (_get, set, v: string) => set(c, v),
    )
    const e = atom(
      (get) => get(d),
      (_get, set, v: string) => set(d, v),
    )
    const scopes = [
      new Set<Atom<unknown>>([a]),
      new Set<Atom<unknown>>([b]),
      new Set<Atom<unknown>>([c]),
      new Set<Atom<unknown>>([d]),
      new Set<Atom<unknown>>([e]),
    ] as const

    function makeStores(scope: Set<Atom<unknown>>) {
      const baseStore = createStore()
      const deriStore = baseStore.unstable_derive(
        (getAtomState, atomRead, atomWrite) => {
          const scopedAtomStateMap = new WeakMap()
          const scopedAtomStateSet = new WeakSet()
          return [
            (atom, originAtomState) => {
              if (
                scopedAtomStateSet.has(originAtomState as never) ||
                scope.has(atom)
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
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
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
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[a]: a1, b0(a1), c0(b0(a1)), d0(c0(b0(a1))), e0(d0(c0(b0(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[0])
      baseStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[b]: a0, b1(a1), c0(b1(a1)), d0(c0(b1(a1))), e0(d0(c0(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[1])
      baseStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', 'a', 'a', 'a', 'a'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[c]: a0, b0(a0), c1(b1(a1)), d0(c1(b1(a1))), e0(d0(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[2])
      baseStore.set(c, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', '*', 'a', 'a', 'a'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[d]: a0, b0(a0), c0(b0(a0)), d1(c1(b1(a1))), e0(d1(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[3])
      baseStore.set(d, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', '*', '*', 'a', 'a'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[e]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e1(d1(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[4])
      baseStore.set(e, '*')
      expect(getAtoms(baseStore)).toEqual(['*', '*', '*', '*', '*'])
      expect(getAtoms(deriStore)).toEqual(['*', '*', '*', '*', 'a'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[a]: a1, b0(a1), c0(b0(a1)), d0(c0(b0(a1))), e0(d0(c0(b0(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[0])
      deriStore.set(a, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['*', '*', '*', '*', '*'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[b]: a0, b1(a1), c0(b1(a1)), d0(c0(b1(a1))), e0(d0(c0(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[1])
      deriStore.set(b, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', '*', '*', '*', '*'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[c]: a0, b0(a0), c1(b1(a1)), d0(c1(b1(a1))), e0(d0(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[2])
      deriStore.set(c, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', '*', '*', '*'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[d]: a0, b0(a0), c0(b0(a0)), d1(c1(b1(a1))), e0(d1(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[3])
      deriStore.set(d, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', 'a', '*', '*'])
    }
    /**
     * Ba[ ]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e0(d0(c0(b0(a0))))
     * S1[e]: a0, b0(a0), c0(b0(a0)), d0(c0(b0(a0))), e1(d1(c1(b1(a1))))
     */
    {
      const { baseStore, deriStore } = makeStores(scopes[4])
      deriStore.set(e, '*')
      expect(getAtoms(baseStore)).toEqual(['a', 'a', 'a', 'a', 'a'])
      expect(getAtoms(deriStore)).toEqual(['a', 'a', 'a', 'a', '*'])
    }
  })
})

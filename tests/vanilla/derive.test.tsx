import { describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom, WritableAtom } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type AnyAtom = Atom<unknown>
type AnyWritableAtom = WritableAtom<unknown, unknown[], unknown>

const hasInitialValue = (
  atom: AnyAtom,
): atom is AnyWritableAtom & { init: unknown } => 'init' in atom

const isWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  'write' in atom

const deriveStore = (
  store: Store,
  scopedAtoms: ReadonlySet<AnyAtom> = new Set(),
): Store => {
  const internalStore = createStore()
  const mappedAtoms = new WeakMap<AnyAtom, AnyAtom>()
  let derivedStore!: Store

  const mapAtom = <Value>(originalAtom: Atom<Value>): Atom<Value> => {
    const cachedAtom = mappedAtoms.get(originalAtom as AnyAtom)
    if (cachedAtom) {
      return cachedAtom as Atom<Value>
    }

    let mappedAtom: AnyAtom
    if (hasInitialValue(originalAtom as AnyAtom)) {
      if (scopedAtoms.has(originalAtom as AnyAtom)) {
        const scopedAtom = atom(store.get(originalAtom as never))
        scopedAtom.onMount = (originalAtom as AnyWritableAtom).onMount
        scopedAtom.INTERNAL_onInit = () => originalAtom.INTERNAL_onInit?.(derivedStore)
        mappedAtom = scopedAtom
      } else {
        const syncAtom = atom(0)
        syncAtom.onMount = (setSelf) =>
          store.sub(originalAtom as AnyAtom, () => setSelf((value) => value + 1))
        const unscopedAtom = isWritableAtom(originalAtom as AnyAtom)
          ? atom(
              (get) => {
                get(syncAtom)
                return store.get(originalAtom as never)
              },
              (_get, _set, ...args) =>
                store.set(originalAtom as never, ...(args as never)),
            )
          : atom((get) => {
              get(syncAtom)
              return store.get(originalAtom as never)
            })
        unscopedAtom.INTERNAL_onInit = () =>
          originalAtom.INTERNAL_onInit?.(derivedStore)
        mappedAtom = unscopedAtom as AnyAtom
      }
    } else if (isWritableAtom(originalAtom as AnyAtom)) {
      const mappedWritableAtom = atom(
        (get, options) =>
          originalAtom.read.call(
            originalAtom,
            ((dependencyAtom: AnyAtom) => get(mapAtom(dependencyAtom))) as never,
            options as never,
          ),
        (get, set, ...args) =>
          (originalAtom as AnyWritableAtom).write.call(
            originalAtom,
            ((dependencyAtom: AnyAtom) => get(mapAtom(dependencyAtom))) as never,
            ((dependencyAtom: AnyWritableAtom, ...innerArgs: unknown[]) =>
              set(
                mapAtom(dependencyAtom as AnyAtom) as AnyWritableAtom,
                ...(innerArgs as never),
              )) as never,
            ...(args as never),
          ),
      )
      mappedWritableAtom.onMount = (originalAtom as AnyWritableAtom).onMount
      mappedWritableAtom.INTERNAL_onInit = () =>
        originalAtom.INTERNAL_onInit?.(derivedStore)
      mappedAtom = mappedWritableAtom as AnyAtom
    } else {
      const mappedDerivedAtom = atom((get, options) =>
        originalAtom.read.call(
          originalAtom,
          ((dependencyAtom: AnyAtom) => get(mapAtom(dependencyAtom))) as never,
          options as never,
        ),
      )
      mappedDerivedAtom.INTERNAL_onInit = () =>
        originalAtom.INTERNAL_onInit?.(derivedStore)
      mappedAtom = mappedDerivedAtom as AnyAtom
    }

    mappedAtoms.set(originalAtom as AnyAtom, mappedAtom)
    return mappedAtom as Atom<Value>
  }

  derivedStore = {
    get: (atom) => internalStore.get(mapAtom(atom)),
    set: (atom, ...args) => internalStore.set(mapAtom(atom) as never, ...args),
    sub: (atom, listener) => internalStore.sub(mapAtom(atom), listener),
  }

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
    const derivedStore = deriveStore(store, scopedAtoms)

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
    const derivedStore = deriveStore(store, scopedAtoms)

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
      const derivedStore = deriveStore(store, scopedAtoms)
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
      expect(derivedStore.get(b)).toBe('a')
      expect(storeCallback).toHaveBeenCalledTimes(1)
      expect(derivedCallback).toHaveBeenCalledTimes(0)
    }
    {
      const { store, derivedStore } = makeStores()
      const storeCallback = vi.fn()
      const derivedCallback = vi.fn()
      store.sub(b, storeCallback)
      derivedStore.sub(b, derivedCallback)
      derivedStore.set(b, '*')
      expect(store.get(b)).toBe('a')
      expect(derivedStore.get(b)).toBe('*')
      expect(storeCallback).toHaveBeenCalledTimes(0)
      expect(derivedCallback).toHaveBeenCalledTimes(1)
    }
  })
})

it('should pass the correct store instance to the atom initializer', () => {
  expect.assertions(2)
  const baseStore = createStore()
  const derivedStore = deriveStore(baseStore)
  const a = atom(null)
  a.INTERNAL_onInit = (store) => {
    expect(store).toBe(baseStore)
  }
  baseStore.get(a)
  a.INTERNAL_onInit = (store) => {
    expect(store).toBe(derivedStore)
  }
  derivedStore.get(a)
})

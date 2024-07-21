import { waitFor } from '@testing-library/dom'
import { assert, describe, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom, Getter, ExtractAtomValue } from 'jotai/vanilla'

it('should not fire on subscribe', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback1 = vi.fn()
  const callback2 = vi.fn()
  store.sub(countAtom, callback1)
  store.sub(countAtom, callback2)
  expect(callback1).not.toHaveBeenCalled()
  expect(callback2).not.toHaveBeenCalled()
})

it('should not fire subscription if primitive atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback = vi.fn()
  store.sub(countAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 0)
  expect(callback).toHaveBeenCalledTimes(calledTimes)
})

it('should not fire subscription if derived atom value is the same', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom) * 0)
  const callback = vi.fn()
  store.sub(derivedAtom, callback)
  const calledTimes = callback.mock.calls.length
  store.set(countAtom, 1)
  expect(callback).toHaveBeenCalledTimes(calledTimes)
})

it('should unmount with store.get', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const callback = vi.fn()
  const unsub = store.sub(countAtom, callback)
  store.get(countAtom)
  unsub()
  const result = Array.from(
    'dev4_get_mounted_atoms' in store ? store.dev4_get_mounted_atoms() : [],
  )
  expect(result).toEqual([])
})

it('should unmount dependencies with store.get', async () => {
  const store = createStore()
  const countAtom = atom(0)
  const derivedAtom = atom((get) => get(countAtom) * 2)
  const callback = vi.fn()
  const unsub = store.sub(derivedAtom, callback)
  store.get(derivedAtom)
  unsub()
  const result = Array.from(
    'dev4_restore_atoms' in store ? store.dev4_get_mounted_atoms() : [],
  )
  expect(result).toEqual([])
})

it('should update async atom with delay (#1813)', async () => {
  const countAtom = atom(0)

  const resolve: (() => void)[] = []
  const delayedAtom = atom(async (get) => {
    const count = get(countAtom)
    await new Promise<void>((r) => resolve.push(r))
    return count
  })

  const store = createStore()
  store.get(delayedAtom)
  store.set(countAtom, 1)
  resolve.splice(0).forEach((fn) => fn())
  await new Promise<void>((r) => setTimeout(r)) // wait for a tick
  const promise = store.get(delayedAtom)
  resolve.splice(0).forEach((fn) => fn())
  expect(await promise).toBe(1)
})

it('should override a promise by setting', async () => {
  const store = createStore()
  const countAtom = atom(Promise.resolve(0))
  const infinitePending = new Promise<never>(() => {})
  store.set(countAtom, infinitePending)
  const promise = store.get(countAtom)
  store.set(countAtom, Promise.resolve(1))
  expect(await promise).toBe(1)
})

it('should update async atom with deps after await (#1905)', async () => {
  const countAtom = atom(0)
  const resolve: (() => void)[] = []
  const delayedAtom = atom(async (get) => {
    await new Promise<void>((r) => resolve.push(r))
    const count = get(countAtom)
    return count
  })
  const derivedAtom = atom(async (get) => {
    const count = await get(delayedAtom)
    return count
  })

  const store = createStore()
  let lastValue = store.get(derivedAtom)
  const unsub = store.sub(derivedAtom, () => {
    lastValue = store.get(derivedAtom)
  })
  store.set(countAtom, 1)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(1)
  store.set(countAtom, 2)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(2)
  store.set(countAtom, 3)
  resolve.splice(0).forEach((fn) => fn())
  expect(await lastValue).toBe(3)
  unsub()
})

it('should not fire subscription when async atom promise is the same', async () => {
  const promise = Promise.resolve()
  const promiseAtom = atom(promise)
  const derivedGetter = vi.fn((get: Getter) => get(promiseAtom))
  const derivedAtom = atom(derivedGetter)

  const store = createStore()

  expect(derivedGetter).not.toHaveBeenCalled()

  const promiseListener = vi.fn()
  const promiseUnsub = store.sub(promiseAtom, promiseListener)
  const derivedListener = vi.fn()
  const derivedUnsub = store.sub(derivedAtom, derivedListener)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.get(promiseAtom)
  store.get(derivedAtom)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.set(promiseAtom, promise)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  store.set(promiseAtom, promise)

  expect(derivedGetter).toHaveBeenCalledOnce()
  expect(promiseListener).not.toHaveBeenCalled()
  expect(derivedListener).not.toHaveBeenCalled()

  promiseUnsub()
  derivedUnsub()
})

it('should notify subscription with tree dependencies (#1956)', async () => {
  const valueAtom = atom(1)
  const dep1Atom = atom((get) => get(valueAtom) * 2)
  const dep2Atom = atom((get) => get(valueAtom) + get(dep1Atom))
  const dep3Atom = atom((get) => get(dep1Atom))

  const cb = vi.fn()
  const store = createStore()
  store.sub(dep2Atom, vi.fn()) // this will cause the bug
  store.sub(dep3Atom, cb)

  expect(cb).toBeCalledTimes(0)
  expect(store.get(dep3Atom)).toBe(2)
  store.set(valueAtom, (c) => c + 1)
  expect(cb).toBeCalledTimes(1)
  expect(store.get(dep3Atom)).toBe(4)
})

it('should notify subscription with tree dependencies with bail-out', async () => {
  const valueAtom = atom(1)
  const dep1Atom = atom((get) => get(valueAtom) * 2)
  const dep2Atom = atom((get) => get(valueAtom) * 0)
  const dep3Atom = atom((get) => get(dep1Atom) + get(dep2Atom))

  const cb = vi.fn()
  const store = createStore()
  store.sub(dep1Atom, vi.fn())
  store.sub(dep3Atom, cb)

  expect(cb).toBeCalledTimes(0)
  expect(store.get(dep3Atom)).toBe(2)
  store.set(valueAtom, (c) => c + 1)
  expect(cb).toBeCalledTimes(1)
  expect(store.get(dep3Atom)).toBe(4)
})

it('should bail out with the same value with chained dependency (#2014)', async () => {
  const store = createStore()
  const objAtom = atom({ count: 1 })
  const countAtom = atom((get) => get(objAtom).count)
  const deriveFn = vi.fn((get: Getter) => get(countAtom))
  const derivedAtom = atom(deriveFn)
  const deriveFurtherFn = vi.fn((get: Getter) => {
    get(objAtom) // intentional extra dependency
    return get(derivedAtom)
  })
  const derivedFurtherAtom = atom(deriveFurtherFn)
  const callback = vi.fn()
  store.sub(derivedFurtherAtom, callback)
  expect(store.get(derivedAtom)).toBe(1)
  expect(store.get(derivedFurtherAtom)).toBe(1)
  expect(callback).toHaveBeenCalledTimes(0)
  expect(deriveFn).toHaveBeenCalledTimes(1)
  expect(deriveFurtherFn).toHaveBeenCalledTimes(1)
  store.set(objAtom, (obj) => ({ ...obj }))
  expect(callback).toHaveBeenCalledTimes(0)
  expect(deriveFn).toHaveBeenCalledTimes(1)
  expect(deriveFurtherFn).toHaveBeenCalledTimes(2)
})

it('should not call read function for unmounted atoms (#2076)', async () => {
  const store = createStore()
  const countAtom = atom(1)
  const derive1Fn = vi.fn((get: Getter) => get(countAtom))
  const derived1Atom = atom(derive1Fn)
  const derive2Fn = vi.fn((get: Getter) => get(countAtom))
  const derived2Atom = atom(derive2Fn)
  expect(store.get(derived1Atom)).toBe(1)
  expect(store.get(derived2Atom)).toBe(1)
  expect(derive1Fn).toHaveBeenCalledTimes(1)
  expect(derive2Fn).toHaveBeenCalledTimes(1)
  store.sub(derived2Atom, vi.fn())
  store.set(countAtom, (c) => c + 1)
  expect(derive1Fn).toHaveBeenCalledTimes(1)
  expect(derive2Fn).toHaveBeenCalledTimes(2)
})

it('should update with conditional dependencies (#2084)', async () => {
  const store = createStore()
  const f1 = atom(false)
  const f2 = atom(false)
  const f3 = atom(
    (get) => get(f1) && get(f2),
    (_get, set, val: boolean) => {
      set(f1, val)
      set(f2, val)
    },
  )
  store.sub(f1, vi.fn())
  store.sub(f2, vi.fn())
  store.sub(f3, vi.fn())
  store.set(f3, true)
  expect(store.get(f3)).toBe(true)
})

it("should recompute dependents' state after onMount (#2098)", async () => {
  const store = createStore()

  const condAtom = atom(false)
  const baseAtom = atom(false)
  baseAtom.onMount = (set) => set(true)
  const derivedAtom = atom(
    (get) => get(baseAtom),
    (_get, set, update: boolean) => set(baseAtom, update),
  )
  const finalAtom = atom(
    (get) => (get(condAtom) ? get(derivedAtom) : undefined),
    (_get, set, value: boolean) => set(derivedAtom, value),
  )

  store.sub(finalAtom, () => {}) // mounts finalAtom, but not baseAtom
  expect(store.get(baseAtom)).toBe(false)
  expect(store.get(derivedAtom)).toBe(false)
  expect(store.get(finalAtom)).toBe(undefined)

  store.set(condAtom, true) // mounts baseAtom
  expect(store.get(baseAtom)).toBe(true)
  expect(store.get(derivedAtom)).toBe(true)
  expect(store.get(finalAtom)).toBe(true)

  store.set(finalAtom, false)
  expect(store.get(baseAtom)).toBe(false)
  expect(store.get(derivedAtom)).toBe(false)
  expect(store.get(finalAtom)).toBe(false)
})

it('should update derived atoms during write (#2107)', async () => {
  const store = createStore()

  const baseCountAtom = atom(1)
  const countAtom = atom(
    (get) => get(baseCountAtom),
    (get, set, newValue: number) => {
      set(baseCountAtom, newValue)
      if (get(countAtom) !== newValue) {
        throw new Error('mismatch')
      }
    },
  )

  store.sub(countAtom, () => {})
  expect(store.get(countAtom)).toBe(1)
  store.set(countAtom, 2)
  expect(store.get(countAtom)).toBe(2)
})

it('resolves dependencies reliably after a delay (#2192)', async () => {
  expect.assertions(1)
  const countAtom = atom(0)
  let result: number | null = null

  const resolve: (() => void)[] = []
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    await new Promise<void>((r) => resolve.push(r))
    return count
  })

  const derivedAtom = atom(
    async (get, { setSelf }) => {
      get(countAtom)
      await Promise.resolve()
      result = await get(asyncAtom)
      if (result === 2) setSelf() // <-- necessary
    },
    () => {},
  )

  const store = createStore()
  store.sub(derivedAtom, () => {})

  await waitFor(() => assert(resolve.length === 1))

  resolve[0]!()
  const increment = (c: number) => c + 1
  store.set(countAtom, increment)
  store.set(countAtom, increment)

  await waitFor(() => assert(resolve.length === 3))

  resolve[1]!()
  resolve[2]!()
  await waitFor(() => assert(result === 2))

  store.set(countAtom, increment)
  store.set(countAtom, increment)

  await waitFor(() => assert(resolve.length === 5))

  resolve[3]!()
  resolve[4]!()

  await new Promise(setImmediate)
  await waitFor(() => assert(store.get(countAtom) === 4))

  expect(result).toBe(4) // 3
})

it('should not recompute a derived atom value if unchanged (#2168)', async () => {
  const store = createStore()
  const countAtom = atom(1)
  const derived1Atom = atom((get) => get(countAtom) * 0)
  const derive2Fn = vi.fn((get: Getter) => get(derived1Atom))
  const derived2Atom = atom(derive2Fn)
  expect(store.get(derived2Atom)).toBe(0)
  store.set(countAtom, (c) => c + 1)
  expect(store.get(derived2Atom)).toBe(0)
  expect(derive2Fn).toHaveBeenCalledTimes(1)
})

it('should mount once with atom creator atom (#2314)', async () => {
  const countAtom = atom(1)
  countAtom.onMount = vi.fn((setAtom: (v: number) => void) => {
    setAtom(2)
  })
  const atomCreatorAtom = atom((get) => {
    const derivedAtom = atom((get) => get(countAtom))
    get(derivedAtom)
  })
  const store = createStore()
  store.sub(atomCreatorAtom, () => {})
  expect(countAtom.onMount).toHaveBeenCalledTimes(1)
})

it('should flush pending write triggered asynchronously and indirectly (#2451)', async () => {
  const store = createStore()
  const anAtom = atom('initial')

  const callbackFn = vi.fn((_value: string) => {})
  const unsub = store.sub(anAtom, () => {
    callbackFn(store.get(anAtom))
  })

  const actionAtom = atom(null, async (_get, set) => {
    await Promise.resolve() // waiting a microtask
    set(indirectSetAtom)
  })

  const indirectSetAtom = atom(null, (_get, set) => {
    set(anAtom, 'next')
  })

  // executing the chain reaction
  await store.set(actionAtom)

  expect(callbackFn).toHaveBeenCalledOnce()
  expect(callbackFn).toHaveBeenCalledWith('next')
  unsub()
})

describe('async atom with subtle timing', () => {
  it('case 1', async () => {
    const store = createStore()
    let resolve = () => {}
    const a = atom(1)
    const b = atom(async (get) => {
      await new Promise<void>((r) => (resolve = r))
      return get(a)
    })
    const bValue = store.get(b)
    store.set(a, 2)
    resolve()
    expect(await bValue).toBe(2)
  })

  it('case 2', async () => {
    const store = createStore()
    let resolve = () => {}
    const a = atom(1)
    const b = atom(async (get) => {
      const aValue = get(a)
      await new Promise<void>((r) => (resolve = r))
      return aValue
    })
    const bValue = store.get(b)
    store.set(a, 2)
    resolve()
    expect(await bValue).toBe(2)
  })
})

describe('aborting atoms', () => {
  // We can't use signal.throwIfAborted as it is not available
  // in earlier versions of TS that this is tested on.
  const throwIfAborted = (signal: AbortSignal) => {
    if (signal.aborted) {
      throw new Error('aborted')
    }
  }

  it('should abort the signal when dependencies change', async () => {
    const a = atom(1)
    const callBeforeAbort = vi.fn()
    const callAfterAbort = vi.fn()
    let resolve = () => {}

    const store = createStore()

    const derivedAtom = atom(async (get, { signal }) => {
      const aVal = get(a)

      await new Promise<void>((r) => (resolve = r))

      callBeforeAbort()

      throwIfAborted(signal)

      callAfterAbort()

      return aVal + 1
    })

    const promise = store.get(derivedAtom)
    const firstResolve = resolve
    store.set(a, 3)

    firstResolve()
    resolve()
    expect(await promise).toEqual(4)

    expect(callBeforeAbort).toHaveBeenCalledTimes(2)
    expect(callAfterAbort).toHaveBeenCalledTimes(1)
  })

  it('should abort the signal when dependencies change and the atom is mounted', async () => {
    const a = atom(1)
    const callBeforeAbort = vi.fn()
    const callAfterAbort = vi.fn()
    let resolve = () => {}

    const store = createStore()

    const derivedAtom = atom(async (get, { signal }) => {
      const aVal = get(a)

      await new Promise<void>((r) => (resolve = r))

      callBeforeAbort()

      throwIfAborted(signal)

      callAfterAbort()

      return aVal + 1
    })

    store.sub(derivedAtom, () => {})
    const firstResolve = resolve
    store.set(a, 3)

    firstResolve()
    resolve()

    await new Promise(setImmediate)

    expect(callBeforeAbort).toHaveBeenCalledTimes(2)
    expect(callAfterAbort).toHaveBeenCalledTimes(1)
  })

  it('should not abort the signal when unsubscribed', async () => {
    const a = atom(1)
    const callBeforeAbort = vi.fn()
    const callAfterAbort = vi.fn()
    let resolve = () => {}

    const store = createStore()

    const derivedAtom = atom(async (get, { signal }) => {
      const aVal = get(a)

      await new Promise<void>((r) => (resolve = r))

      callBeforeAbort()

      throwIfAborted(signal)

      callAfterAbort()

      return aVal + 1
    })

    const unsub = store.sub(derivedAtom, () => {})

    unsub()
    resolve()

    expect(await store.get(derivedAtom)).toEqual(2)
    expect(callBeforeAbort).toHaveBeenCalledTimes(1)
    expect(callAfterAbort).toHaveBeenCalledTimes(1)
  })
})

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
    const derivedStore = store.unstable_derive((getAtomState) => {
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
      ]
    })

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
    const derivedStore = store.unstable_derive((getAtomState) => {
      type AnyAtom = Parameters<typeof getAtomState>[0]
      type AtomState = ReturnType<typeof getAtomState>
      const scopedAtomStateMap = new WeakMap<AnyAtom, AtomState>()
      const scopedInvertAtomStateMap = new WeakMap<AtomState, AnyAtom>()
      const copyMounted = (
        mounted: NonNullable<AtomState['m']>,
      ): NonNullable<AtomState['m']> => ({
        ...mounted,
        d: new Set(mounted.d),
        t: new Set(mounted.t),
      })
      const copyAtomState = (atomState: AtomState): AtomState => ({
        ...atomState,
        d: new Map(atomState.d),
        p: new Set(atomState.p),
        ...('m' in atomState ? { m: copyMounted(atomState.m) } : {}),
      })
      return [
        (atom, originAtomState) => {
          type TheAtomState = ReturnType<
            typeof getAtomState<ExtractAtomValue<typeof atom>>
          >
          let atomState = scopedAtomStateMap.get(atom)
          if (atomState) {
            return atomState as TheAtomState
          }
          if (
            scopedInvertAtomStateMap.has(originAtomState as never) ||
            scopedAtoms.has(atom)
          ) {
            atomState = { d: new Map(), p: new Set(), n: 0 }
            scopedAtomStateMap.set(atom, atomState)
            scopedInvertAtomStateMap.set(atomState, atom)
            return atomState as TheAtomState
          }
          const originalAtomState = getAtomState(atom, originAtomState)
          if (
            Array.from(originalAtomState.d).some(([a]) =>
              scopedAtomStateMap.has(a),
            )
          ) {
            atomState = copyAtomState(originalAtomState)
            scopedAtomStateMap.set(atom, atomState)
            scopedInvertAtomStateMap.set(atomState, atom)
            return atomState as TheAtomState
          }
          return originalAtomState
        },
      ]
    })

    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('ab')

    derivedStore.set(a, 'a2')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(c)).toBe('ab')
    expect(derivedStore.get(c)).toBe('a2b')

    derivedStore.sub(c, vi.fn())
    derivedStore.set(b, 'b2')
    await new Promise((resolve) => setTimeout(resolve))
    expect(store.get(c)).toBe('ab2')
    expect(derivedStore.get(c)).toBe('a2b2')
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
    const derivedStore = store.unstable_derive((getAtomState) => {
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
      ]
    })

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
      const deriStore = baseStore.unstable_derive((getAtomState) => {
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
        ]
      })
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

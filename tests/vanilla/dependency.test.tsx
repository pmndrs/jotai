import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import { sleep } from '../test-utils.js'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('can propagate updates with async atom chains', async () => {
  const store = createStore()

  const countAtom = atom(1)
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    await sleep(100)
    return count
  })
  const async2Atom = atom((get) => get(asyncAtom))
  const async3Atom = atom((get) => get(async2Atom))

  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(async3Atom)).resolves.toBe(1)

  store.set(countAtom, (c) => c + 1)
  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(async3Atom)).resolves.toBe(2)

  store.set(countAtom, (c) => c + 1)
  expect(store.get(async3Atom) instanceof Promise).toBeTruthy()
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(async3Atom)).resolves.toBe(3)
})

it('can get async atom with deps more than once before resolving (#1668)', async () => {
  const countAtom = atom(0)
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    await sleep(100)
    return count
  })
  const store = createStore()

  store.set(countAtom, (c) => c + 1)
  store.get(asyncAtom)
  store.set(countAtom, (c) => c + 1)
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(asyncAtom)).resolves.toBe(2)
})

it('correctly updates async derived atom after get/set update', async () => {
  const baseAtom = atom(0)
  const derivedAsyncAtom = atom(
    async (get) => get(baseAtom) + 1,
    async (_get, set, val) => set(baseAtom, val as number),
  )

  const store = createStore()

  // NOTE: Have to .set() straight after await on .get(), so that it executes
  // in the same JS event loop cycle!
  let derived = await store.get(derivedAsyncAtom)
  await store.set(derivedAsyncAtom, 2)

  expect(derived).toBe(1)
  expect(store.get(baseAtom)).toBe(2)

  derived = await store.get(derivedAsyncAtom)
  expect(derived).toBe(3)
})

it('correctly handles the same promise being returned twice from an atom getter (#2151)', async () => {
  const asyncDataAtom = atom(async () => {
    return 'Asynchronous Data'
  })

  const counterAtom = atom(0)

  const derivedAtom = atom((get) => {
    get(counterAtom) // depending on sync data
    return get(asyncDataAtom) // returning a promise from another atom
  })

  const store = createStore()

  store.get(derivedAtom)
  // setting the `counterAtom` dependency on the same JS event loop cycle, before
  // the `derivedAtom` promise resolves.
  store.set(counterAtom, 1)
  await expect(store.get(derivedAtom)).resolves.toBe('Asynchronous Data')
})

it('keeps atoms mounted between recalculations', async () => {
  const metrics1 = {
    mounted: 0,
    unmounted: 0,
  }
  const atom1 = atom(0)
  atom1.onMount = () => {
    ++metrics1.mounted
    return () => {
      ++metrics1.unmounted
    }
  }

  const metrics2 = {
    mounted: 0,
    unmounted: 0,
  }
  const atom2 = atom(0)
  atom2.onMount = () => {
    ++metrics2.mounted
    return () => {
      ++metrics2.unmounted
    }
  }

  const derivedAtom = atom(async (get) => {
    get(atom1)
    await sleep(100)
    get(atom2)
  })

  const unrelatedAtom = atom(0)

  const store = createStore()

  store.sub(derivedAtom, () => {})
  await vi.advanceTimersByTimeAsync(100)
  store.set(unrelatedAtom, (c) => c + 1)
  expect(metrics1).toEqual({
    mounted: 1,
    unmounted: 0,
  })
  expect(metrics2).toEqual({
    mounted: 1,
    unmounted: 0,
  })

  store.set(atom1, (c) => c + 1)
  await vi.advanceTimersByTimeAsync(100)
  expect(metrics1).toEqual({
    mounted: 1,
    unmounted: 0,
  })
  expect(metrics2).toEqual({
    mounted: 1,
    unmounted: 0,
  })
})

it('should not provide stale values to conditional dependents', () => {
  const dataAtom = atom<number[]>([100])
  const hasFilterAtom = atom(false)
  const filteredAtom = atom((get) => {
    const data = get(dataAtom)
    const hasFilter = get(hasFilterAtom)
    if (hasFilter) {
      return []
    } else {
      return data
    }
  })
  const stageAtom = atom((get) => {
    const hasFilter = get(hasFilterAtom)
    if (hasFilter) {
      const filtered = get(filteredAtom)
      return filtered.length === 0 ? 'is-empty' : 'has-data'
    } else {
      return 'no-filter'
    }
  })

  const store = createStore()
  store.sub(filteredAtom, () => undefined)
  store.sub(stageAtom, () => undefined)

  expect(store.get(stageAtom), 'should start without filter').toBe('no-filter')
  store.set(hasFilterAtom, true)
  expect(store.get(stageAtom), 'should update').toBe('is-empty')
})

it('settles never resolving async derivations with deps picked up sync', async () => {
  const resolve: ((value: number) => void)[] = []

  const syncAtom = atom({
    promise: new Promise<number>((r) => resolve.push(r)),
  })

  const asyncAtom = atom(async (get) => {
    return await get(syncAtom).promise
  })

  const store = createStore()

  let sub = 0
  const values: unknown[] = []
  store.get(asyncAtom).then((value) => values.push(value))
  store.sub(asyncAtom, () => {
    sub++
    store.get(asyncAtom).then((value) => values.push(value))
  })

  store.set(syncAtom, {
    promise: new Promise<number>((r) => resolve.push(r)),
  })
  resolve[1]?.(1)

  await vi.advanceTimersByTimeAsync(0)
  expect(values).toEqual([1])
  expect(sub).toBe(1)
})

it('settles never resolving async derivations with deps picked up async', async () => {
  const resolve: ((value: number) => void)[] = []

  const syncAtom = atom({
    promise: new Promise<number>((r) => resolve.push(r)),
  })

  const asyncAtom = atom(async (get) => {
    // we want to pick up `syncAtom` as an async dep
    await sleep(100)
    return await get(syncAtom).promise
  })

  const store = createStore()

  let sub = 0
  const values: unknown[] = []
  store.get(asyncAtom).then((value) => values.push(value))
  store.sub(asyncAtom, () => {
    sub++
    store.get(asyncAtom).then((value) => values.push(value))
  })

  await vi.advanceTimersByTimeAsync(100)
  store.set(syncAtom, {
    promise: new Promise<number>((r) => resolve.push(r)),
  })
  resolve[1]?.(1)

  await vi.advanceTimersByTimeAsync(100)
  expect(values).toEqual([1])
  expect(sub).toBe(1)
})

it('refreshes deps for each async read', async () => {
  const countAtom = atom(0)
  const depAtom = atom(false)
  const values: number[] = []
  const asyncAtom = atom(async (get) => {
    const count = get(countAtom)
    values.push(count)
    if (count === 0) {
      get(depAtom)
    }
    await sleep(100)
    return count
  })
  const store = createStore()

  store.get(asyncAtom)
  store.set(countAtom, (c) => c + 1)
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(asyncAtom)).resolves.toBe(1)

  store.set(depAtom, true)
  store.get(asyncAtom)
  await vi.advanceTimersByTimeAsync(0)
  expect(values).toEqual([0, 1])
})

it('should not re-evaluate stable derived atom values in situations where dependencies are re-ordered (#2738)', () => {
  const callCounter = vi.fn()
  const countAtom = atom(0)
  const rootAtom = atom(false)
  const stableDep = atom((get) => {
    get(rootAtom)
    return 1
  })
  const stableDepDep = atom((get) => {
    get(stableDep)
    callCounter()
    return 2 + get(countAtom)
  })

  const newAtom = atom((get) => {
    if (get(rootAtom) || get(countAtom) > 0) {
      return get(stableDepDep)
    }

    return get(stableDep)
  })

  const store = createStore()
  store.sub(stableDepDep, () => {})
  store.sub(newAtom, () => {})
  expect(store.get(stableDepDep)).toBe(2)
  expect(callCounter).toHaveBeenCalledTimes(1)

  store.set(rootAtom, true)
  expect(store.get(newAtom)).toBe(2)
  expect(callCounter).toHaveBeenCalledTimes(1)

  store.set(rootAtom, false)
  store.set(countAtom, 1)
  expect(store.get(newAtom)).toBe(3)
  expect(callCounter).toHaveBeenCalledTimes(2)
})

it('handles complex dependency chains', async () => {
  const baseAtom = atom(1)
  const derived1 = atom((get) => get(baseAtom) * 2)
  const derived2 = atom((get) => get(derived1) + 1)
  const asyncDerived = atom(async (get) => {
    const value = get(derived2)
    await sleep(100)
    return value * 2
  })
  const store = createStore()

  store.get(asyncDerived)
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(asyncDerived)).resolves.toBe(6)

  store.set(baseAtom, 2)
  store.get(asyncDerived)
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(asyncDerived)).resolves.toBe(10)
})

it('can read sync derived atom in write without initializing', () => {
  const store = createStore()
  const a = atom(0)
  const b = atom((get) => get(a) + 1)
  const c = atom(null, (get, set) => set(a, get(b)))
  store.set(c)
  expect(store.get(a)).toBe(1)
  store.set(c)
  // note: this is why write get needs to update deps
  expect(store.get(a)).toBe(2)
})

it('can read in write function without changing dependencies', () => {
  // https://github.com/pmndrs/jotai/discussions/2789
  const a = atom(0)
  let bReadCount = 0
  const b = atom(
    (get) => {
      ++bReadCount
      return get(a)
    },
    () => {},
  )
  let bIsMounted = false
  b.onMount = () => {
    bIsMounted = true
  }
  const c = atom((get) => get(a))
  const w = atom(null, (get, set) => {
    expect(bReadCount).toBe(0)
    const bValue = get(b)
    expect(bReadCount).toBe(1)
    set(a, bValue + 1)
    expect(bReadCount).toBe(1)
  })

  const store = createStore()
  store.sub(c, () => {}) // mounts c,a
  store.set(w)
  expect(bIsMounted).toBe(false)
})

it('can cache reading an atom in write function (without mounting)', () => {
  let aReadCount = 0
  const a = atom(() => {
    ++aReadCount
    return 'a'
  })
  const w = atom(null, (get) => get(a))
  const store = createStore()
  store.set(w)
  expect(aReadCount).toBe(1)
  store.set(w)
  expect(aReadCount).toBe(1)
})

it('can cache reading an atom in write function (with mounting)', () => {
  let aReadCount = 0
  const a = atom(() => {
    ++aReadCount
    return 'a'
  })
  const w = atom(null, (get) => get(a))
  const store = createStore()
  store.sub(a, () => {}) // mounts a
  store.set(w)
  expect(aReadCount).toBe(1)
  store.set(w)
  expect(aReadCount).toBe(1)
})

it('batches sync writes', () => {
  const a = atom(0)
  const b = atom((get) => get(a))
  const fetch = vi.fn()
  const c = atom((get) => fetch(get(a)))
  const w = atom(null, (get, set) => {
    set(a, 1)
    expect(get(b)).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(0)
  })
  const store = createStore()
  store.sub(b, () => {})
  store.sub(c, () => {})
  fetch.mockClear()
  store.set(w)
  expect(fetch).toHaveBeenCalledOnce()
  expect(fetch).toBeCalledWith(1)
  expect(store.get(a)).toBe(1)
})

it('reconciles dynamic dependencies changed by an eager read in write', () => {
  const base = atom(1)
  const derived = atom((get) => get(atom((get) => get(base))))
  const w = atom(null, (get, set) => {
    set(base, 2)
    expect(get(derived)).toBe(2)
  })
  const store = createStore()
  const listener = vi.fn()
  store.sub(derived, listener)
  store.set(w)
  expect(store.get(derived)).toBe(2)
  expect(listener).toHaveBeenCalledTimes(1)
  store.set(base, 3)
  expect(store.get(derived)).toBe(3)
  expect(listener).toHaveBeenCalledTimes(2)
  store.set(base, 4)
  expect(store.get(derived)).toBe(4)
  expect(listener).toHaveBeenCalledTimes(3)
})

it('reconciles dynamic dependencies even if the derived value is unchanged', () => {
  const base = atom(1)
  const derived = atom((get) =>
    get(atom((get) => get(base))) > 10 ? 'big' : 'small',
  )
  const w = atom(null, (get, set) => {
    set(base, 2)
    expect(get(derived)).toBe('small')
  })
  const store = createStore()
  const listener = vi.fn()
  store.sub(derived, listener)
  store.set(w)
  expect(listener).not.toHaveBeenCalled()
  store.set(base, 20)
  expect(store.get(derived)).toBe('big')
  expect(listener).toHaveBeenCalledOnce()
})

it('mounts and unmounts dependencies added and removed asynchronously', async () => {
  const cond = atom(true)
  const a = atom(0)
  const b = atom(0)
  const onUnmountA = vi.fn()
  const onMountB = vi.fn()
  a.onMount = () => onUnmountA
  b.onMount = onMountB
  const derived = atom(async (get) => {
    const c = get(cond)
    await sleep(100)
    return c ? get(a) : get(b)
  })
  const store = createStore()
  store.sub(derived, () => {})
  await vi.advanceTimersByTimeAsync(100)
  expect(onMountB).not.toHaveBeenCalled()
  store.set(cond, false)
  await vi.advanceTimersByTimeAsync(100)
  expect(onUnmountA).toHaveBeenCalledOnce()
  expect(onMountB).toHaveBeenCalledOnce()
  store.set(b, 1)
  await vi.advanceTimersByTimeAsync(100)
  await expect(store.get(derived)).resolves.toBe(1)
})

it('unmounts the last dependency when it is removed', () => {
  const base = atom(1)
  const onUnmount = vi.fn()
  base.onMount = () => onUnmount
  let useBase = true
  const derived = atom((get) => (useBase ? get(base) : 0))
  const store = createStore()
  store.sub(derived, () => {})
  useBase = false
  store.set(base, 2)
  expect(store.get(derived)).toBe(0)
  expect(onUnmount).toHaveBeenCalledOnce()
})

it('does not call onMount for a dependency mounted and unmounted within one write', () => {
  const sel = atom(true)
  const a = atom(0)
  const b = atom(1)
  const onMount = vi.fn()
  const onUnmount = vi.fn()
  b.onMount = () => {
    onMount()
    return onUnmount
  }
  const derived = atom((get) => (get(sel) ? get(a) : get(b)))
  const w = atom(null, (get, set) => {
    set(sel, false)
    expect(get(derived)).toBe(1)
    set(sel, true)
    expect(get(derived)).toBe(0)
  })
  const store = createStore()
  store.sub(derived, () => {})
  store.set(w)
  expect(onMount).not.toHaveBeenCalled()
  expect(onUnmount).not.toHaveBeenCalled()
})

it('calls onMount once for a dependency removed and re-added within one write', () => {
  const sel = atom(true)
  const a = atom(0)
  const b = atom(1)
  const onMount = vi.fn()
  const onUnmount = vi.fn()
  b.onMount = () => {
    onMount()
    return onUnmount
  }
  const derived = atom((get) => (get(sel) ? get(a) : get(b)))
  const w = atom(null, (get, set) => {
    set(sel, false)
    expect(get(derived)).toBe(1)
    set(sel, true)
    expect(get(derived)).toBe(0)
    set(sel, false)
    expect(get(derived)).toBe(1)
  })
  const store = createStore()
  const unsub = store.sub(derived, () => {})
  store.set(w)
  expect(onMount).toHaveBeenCalledOnce()
  expect(onUnmount).not.toHaveBeenCalled()
  unsub()
  expect(onUnmount).toHaveBeenCalledOnce()
})

it('does not call onMount for a dependency unmounted by a listener before callbacks flush', () => {
  const sel = atom(true)
  const a = atom(0)
  const b = atom(1)
  const onMount = vi.fn()
  const onUnmount = vi.fn()
  b.onMount = () => {
    onMount()
    return onUnmount
  }
  const derived = atom((get) => (get(sel) ? get(a) : get(b)))
  const store = createStore()
  const unsub = store.sub(derived, () => unsub())
  store.set(sel, false)
  expect(onMount).not.toHaveBeenCalled()
  expect(onUnmount).not.toHaveBeenCalled()
})

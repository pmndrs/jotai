import { expect, it, vi } from 'vitest'
import type { Getter, Setter, WritableAtom } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Cleanup = () => void
type Effect = (get: Getter, set: Setter) => void | Cleanup
type Ref = {
  set?: Setter
  update?: () => void
  cleanup?: Cleanup | undefined
}

function syncEffect(effect: Effect) {
  const refAtom = atom(
    () => ({}) as Ref,
    (get) => {
      const ref = get(refAtom)
      return () => {
        ref.cleanup?.()
        ref.cleanup = undefined
      }
    },
  )
  refAtom.onMount = (mount) => mount()
  const internalAtom = atom((get) => {
    const ref = get(refAtom)
    const fn = () => {
      ref.cleanup?.()
      ref.cleanup = effect(get, ref.set!) || undefined
    }
    ref.update = fn
    return { fn }
  })
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    ref.set = (a, ...args) => {
      try {
        return store.set(a, ...args)
      } finally {
        store.get(a)
      }
    }
    const runAtom = atom((get) => get(internalAtom))
    const unsub = store.sub(runAtom, () => {}) 
    ref.update?.()
    unsub()
    store.unstable_derive((...storeArgs) => {
      const getAtomState = storeArgs[0]
      const atomState = getAtomState(internalAtom)
      if (!atomState) {
        throw new Error('atomState is undefined unexpectedly')
      }
      atomState.u = () => ref.update?.()
      return storeArgs
    })
  }
  return atom((get) => {
    get(internalAtom)
  })
}

const withSyncEffect = <T extends WritableAtom<unknown, never[], unknown>>(
  a: T,
  effect: Effect,
): T => {
  const effectAtom = syncEffect(effect)
  return atom(
    (get) => {
      get(effectAtom)
      return get(a)
    },
    (_get, set, ...args) => set(a, ...args),
  ) as T
}

it('responds to changes to atoms when subscribed', () => {
  const store = createStore()
  const a = atom(1)
  const b = atom(1)
  const w = atom(null, (_get, set, value: number) => {
    set(a, value)
    set(b, value)
  })
  const results: number[] = []
  const cleanup = vi.fn()
  const effect = vi.fn((get: Getter) => {
    results.push(get(a) * 10 + get(b))
    return cleanup
  })
  const e = syncEffect(effect)
  const unsub = store.sub(e, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(results).toStrictEqual([11]) // initial values at time of effect mount
  store.set(a, 2)
  expect(results).toStrictEqual([11, 21])
  store.set(b, 2)
  expect(results).toStrictEqual([11, 21, 22])
  store.set(w, 3)
  // intermediate state of '32' should not be recorded since the effect runs _after_ graph has been computed
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(cleanup).toBeCalledTimes(3)
  expect(effect).toBeCalledTimes(4)
  unsub()
  expect(cleanup).toBeCalledTimes(4)
  expect(effect).toBeCalledTimes(4)
  store.set(a, 4)
  // the effect is unmounted so no more updates
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(effect).toBeCalledTimes(4)
})

it('responds to changes to atoms when mounted with get', () => {
  const store = createStore()
  const a = atom(1)
  const b = atom(1)
  const w = atom(null, (_get, set, value: number) => {
    set(a, value)
    set(b, value)
  })
  const results: number[] = []
  const cleanup = vi.fn()
  const effect = vi.fn((get: Getter) => {
    results.push(get(a) * 10 + get(b))
    return cleanup
  })
  const e = syncEffect(effect)
  const d = atom((get) => get(e))
  const unsub = store.sub(d, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(results).toStrictEqual([11]) // initial values at time of effect mount
  store.set(a, 2)
  expect(results).toStrictEqual([11, 21])
  store.set(b, 2)
  expect(results).toStrictEqual([11, 21, 22])
  store.set(w, 3)
  // intermediate state of '32' should not be recorded since the effect runs _after_ graph has been computed
  expect(results).toStrictEqual([11, 21, 22, 33])
  expect(cleanup).toBeCalledTimes(3)
  expect(effect).toBeCalledTimes(4)
  unsub()
  expect(cleanup).toBeCalledTimes(4)
  expect(effect).toBeCalledTimes(4)
})

it('sets values to atoms without causing infinite loop', () => {
  const store = createStore()
  const a = atom(1)
  const effect = vi.fn((get: Getter, set: Setter) => {
    set(a, get(a) + 1)
  })
  const e = syncEffect(effect)
  const unsub = store.sub(e, () => {}) // mount syncEffect
  expect(effect).toBeCalledTimes(1)
  expect(store.get(a)).toBe(2) // initial values at time of effect mount
  store.set(a, (v) => ++v)
  expect(store.get(a)).toBe(4)
  expect(effect).toBeCalledTimes(2)
  unsub()
  expect(effect).toBeCalledTimes(2)
})

it('read two atoms', () => {
  const store = createStore()
  const a = atom(0)
  const b = atom(0)
  const r = atom([] as number[])
  const e = syncEffect((get, set) => {
    set(r, (v) => [...v, get(a) * 10 + get(b)])
  })
  store.sub(e, () => {})
  const w = atom(null, (_get, set) => {
    set(a, (v) => v + 1)
    set(b, (v) => v + 1)
  })
  store.set(w)
  expect(store.get(r)).toEqual([0, 11])
  expect(store.get(r)).not.toEqual([0, 10, 11])
})

it('does not cause infinite loops when it references itself', async () => {
  const countWithEffectAtom = withSyncEffect(atom(0), (get, set) => {
    get(countWithEffectAtom)
    set(countWithEffectAtom, (v) => v + 1)
  })
  const store = createStore()
  store.sub(countWithEffectAtom, () => {})
  expect(store.get(countWithEffectAtom)).toBe(1)
  store.set(countWithEffectAtom, (v) => {
    return v + 1
  })
  expect(store.get(countWithEffectAtom)).toBe(3)
})

it('fires after recomputeDependents and before atom listeners', async () => {
  const store = createStore()
  const a = atom({} as { v?: number })
  let r
  const e = syncEffect((get) => {
    r = get(a).v
  })
  const b = atom((get) => {
    const aValue = get(a)
    get(e)
    // sets property `v` inside recomputeDependents
    aValue.v = 1
    return aValue
  })
  store.sub(b, () => {
    // sets property `v` inside atom listener
    store.get(a).v = 2
  })
  store.set(a, { v: 0 })
  expect(r).toStrictEqual(1)
})

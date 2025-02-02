import { expect, it, vi } from 'vitest'
import type { Atom, Getter, Setter, WritableAtom } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'
import {
  INTERNAL_createStoreHookForAtom,
  INTERNAL_getStoreStateRev1 as INTERNAL_getStoreState,
} from 'jotai/vanilla/internals'

type Cleanup = () => void
type Effect = (get: Getter, set: Setter) => Cleanup | void
type Ref = {
  get?: Getter
  inProgress: number
  epoch: number
  cleanup?: Cleanup | undefined
}

function syncEffect(effect: Effect): Atom<void> {
  const refAtom = atom<Ref>(() => ({ inProgress: 0, epoch: 0 }))
  const refreshAtom = atom(0)
  const internalAtom = atom(
    (get) => {
      get(refreshAtom)
      const ref = get(refAtom)
      if (ref.inProgress) {
        return ref.epoch
      }
      ref.get = get
      return ++ref.epoch
    },
    () => {},
  )
  internalAtom.onMount = () => {
    return () => {}
  }
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    const runEffect = () => {
      const deps = new Set<Atom<unknown>>()
      try {
        ref.cleanup?.()
        ref.cleanup =
          effect(
            (a) => {
              deps.add(a)
              return store.get(a)
            },
            (a, ...args) => {
              try {
                ++ref.inProgress
                return store.set(a, ...args)
              } finally {
                --ref.inProgress
              }
            },
          ) || undefined
      } finally {
        deps.forEach(ref.get!)
      }
    }
    const [, storeHooks] = INTERNAL_getStoreState(store)
    const mountHook = (storeHooks.m =
      storeHooks.m || INTERNAL_createStoreHookForAtom())
    mountHook.add(internalAtom, () => {
      // mount
      store.set(refreshAtom, (v) => v + 1)
    })
    const unmountHook = (storeHooks.u =
      storeHooks.u || INTERNAL_createStoreHookForAtom())
    unmountHook.add(internalAtom, () => {
      // unmount
      const syncEffectChannel = ensureSyncEffectChannel(store)
      syncEffectChannel.add(() => {
        ref.cleanup?.()
        delete ref.cleanup
      })
    })
    const changedHook = (storeHooks.c =
      storeHooks.c || INTERNAL_createStoreHookForAtom())
    changedHook.add(internalAtom, () => {
      // update
      const syncEffectChannel = ensureSyncEffectChannel(store)
      syncEffectChannel.add(runEffect)
    })
  }
  return atom((get) => {
    get(internalAtom)
  })
}

const syncEffectChannelSymbol = Symbol()

function ensureSyncEffectChannel(store: any) {
  if (!store[syncEffectChannelSymbol]) {
    store[syncEffectChannelSymbol] = new Set<() => void>()
    const [, storeHooks] = INTERNAL_getStoreState(store)
    const originalFlushHook = storeHooks.f
    storeHooks.f = () => {
      originalFlushHook?.()
      const syncEffectChannel = store[syncEffectChannelSymbol] as Set<
        () => void
      >
      const fns = Array.from(syncEffectChannel)
      syncEffectChannel.clear()
      fns.forEach((fn: () => void) => fn())
    }
  }
  return store[syncEffectChannelSymbol] as Set<() => void>
}

it('fires after recomputeDependents and before atom listeners', async function test() {
  const store = createStore()
  const a = atom({} as { v?: number })
  let r
  const e = syncEffect(function effect(get) {
    r = get(a).v
  })
  const b = atom(function bAtomRead(get) {
    const aValue = get(a)
    get(e)
    // sets property `v` inside recomputeDependents
    aValue.v = 1
    return aValue
  })
  store.sub(b, function bAtomListener() {
    // sets property `v` inside atom listener
    store.get(a).v = 2
  })
  store.set(a, { v: 0 })
  expect(r).toBe(1)
})

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

// TODO: consider removing this after we provide a new syncEffect implementation
it('supports recursive setting synchronous in read', async () => {
  const store = createStore()
  const a = atom(0)
  const refreshAtom = atom(0)
  type Ref = {
    isMounted?: true
    recursing: number
    set: Setter
  }
  const refAtom = atom(
    () => ({ recursing: 0 }) as Ref,
    (get, set) => {
      const ref = get(refAtom)
      ref.isMounted = true
      ref.set = set
      set(refreshAtom, (v) => v + 1)
    },
  )
  refAtom.onMount = (mount) => mount()
  const effectAtom = atom((get) => {
    get(refreshAtom)
    const ref = get(refAtom)
    if (!ref.isMounted) {
      return
    }
    const recurse = <Value, Args extends unknown[], Result>(
      a: WritableAtom<Value, Args, Result>,
      ...args: Args
    ): Result => {
      ++ref.recursing
      const value = ref.set(a, ...args)
      return value as Result
    }
    function runEffect() {
      const v = get(a)
      if (v < 5) {
        recurse(a, (v) => v + 1)
      }
    }
    if (ref.recursing) {
      let prevRecursing = ref.recursing
      do {
        prevRecursing = ref.recursing
        runEffect()
      } while (prevRecursing !== ref.recursing)
      ref.recursing = 0
      return Promise.resolve()
    }
    return Promise.resolve().then(runEffect)
  })
  store.sub(effectAtom, () => {})
  await Promise.resolve()
  expect(store.get(a)).toBe(5)
})

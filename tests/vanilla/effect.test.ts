import { expect, it, vi } from 'vitest'
import type { Atom, Getter, Setter } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type GetAtomState = Parameters<Parameters<Store['unstable_derive']>[0]>[0]
type AtomState = NonNullable<ReturnType<GetAtomState>>
type AnyAtom = Atom<unknown>

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
  const internalAtom = atom((get) => {
    get(refreshAtom)
    const ref = get(refAtom)
    if (ref.inProgress) {
      return ref.epoch
    }
    ref.get = get
    return ++ref.epoch
  })
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    const runEffect = () => {
      const deps = new Set<AnyAtom>()
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
    const internalAtomState = getAtomState(store, internalAtom)
    const originalMountHook = internalAtomState.h
    internalAtomState.h = () => {
      originalMountHook?.()
      if (internalAtomState.m) {
        // mount
        store.set(refreshAtom, (v) => v + 1)
      } else {
        // unmount
        const syncEffectChannel = ensureSyncEffectChannel(store)
        syncEffectChannel.add(() => {
          ref.cleanup?.()
          delete ref.cleanup
        })
      }
    }
    const originalUpdateHook = internalAtomState.u
    internalAtomState.u = () => {
      originalUpdateHook?.()
      // update
      const syncEffectChannel = ensureSyncEffectChannel(store)
      syncEffectChannel.add(runEffect)
    }
  }
  return atom((get) => {
    get(internalAtom)
  })
}

const INTERNAL_flushStoreHook = Symbol.for('JOTAI.EXPERIMENTAL.FLUSHSTOREHOOK')
const syncEffectChannelSymbol = Symbol()

function ensureSyncEffectChannel(store: any) {
  if (!store[syncEffectChannelSymbol]) {
    store[syncEffectChannelSymbol] = new Set<() => void>()
    const originalFlushHook = store[INTERNAL_flushStoreHook]
    store[INTERNAL_flushStoreHook] = () => {
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

const getAtomStateMap = new WeakMap<Store, GetAtomState>()

/**
 * HACK: steal atomState to synchronously determine if
 * the atom is mounted
 * We return null to cause the buildStore(...args) to throw
 * to abort creating a derived store
 */
function getAtomState(store: Store, atom: AnyAtom): AtomState {
  let getAtomStateFn = getAtomStateMap.get(store)
  if (!getAtomStateFn) {
    try {
      store.unstable_derive((...storeArgs) => {
        getAtomStateFn = storeArgs[0]
        return null as any
      })
    } catch {
      // expect error
    }
    getAtomStateMap.set(store, getAtomStateFn!)
  }
  return getAtomStateFn!(atom)!
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
    isRecursing?: true
    set: Setter
  }
  const refAtom = atom(
    () => ({}) as Ref,
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
    const recurse = ((...args) => {
      ref.isRecursing = true
      const value = ref.set(...args)
      delete ref.isRecursing
      return value
    }) as Setter
    function runEffect() {
      const v = get(a)
      if (v < 5) {
        recurse(a, (v) => v + 1)
      }
    }
    return Promise.resolve().then(runEffect)
  })
  store.sub(effectAtom, () => {})
  await new Promise((r) => setTimeout(r))
  expect(store.get(a)).toBe(5)
})

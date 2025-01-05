import { expect, it, vi } from 'vitest'
import type { Atom, Getter, Setter } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type GetAtomState = Parameters<Parameters<Store['unstable_derive']>[0]>[0]
type AtomState = NonNullable<ReturnType<GetAtomState>>
type AnyAtom = Atom<unknown>
type Batch = Parameters<NonNullable<AtomState['u']>>[0]

type Cleanup = () => void
type Effect = (get: Getter, set: Setter) => Cleanup | void
type Ref = {
  get?: Getter
  isMounted?: boolean
  inProgress: number
  isRefreshing: number
  epoch: number
  cleanup?: Cleanup | undefined
  error?: unknown
}

const syncEffectChannelSymbol = Symbol()

function syncEffect(effect: Effect): Atom<void> {
  const refAtom = atom<Ref>(() => ({
    inProgress: 0,
    isRefreshing: 0,
    epoch: 0,
  }))
  const refreshAtom = atom(0)
  const internalAtom = atom((get) => {
    get(refreshAtom)
    const ref = get(refAtom)
    if (ref.error) {
      const { error } = ref
      delete ref.error
      // FIXME no test case that requires throwing an error
      throw error
    }
    if (!ref.isMounted || ref.inProgress) {
      return ref.epoch
    }
    if (!ref.isRefreshing) {
      ref.get = get
    }
    return ++ref.epoch
  })
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    function runEffect() {
      try {
        ref.cleanup?.()
        const deps = new Set<AnyAtom>()
        ref.cleanup =
          effect(
            (a) => {
              deps.add(a)
              return ref.get!(a)
            },
            (a, ...args) => {
              try {
                ++ref.inProgress
                return store.set(a, ...args)
              } finally {
                deps.forEach(ref.get!)
                --ref.inProgress
              }
            },
          ) || undefined
      } catch (e) {
        ref.error = e
        // FIXME no test case that requires this refreshing
        try {
          ++ref.isRefreshing
          store.set(refreshAtom, (v) => v + 1)
        } finally {
          ++ref.isRefreshing
        }
      }
    }
    const internalAtomState = getAtomState(store, internalAtom)
    const originalMountHook = internalAtomState.h
    internalAtomState.h = (batch) => {
      originalMountHook?.(batch)
      if (internalAtomState.m) {
        // mount
        ref.isMounted = true
        store.set(refreshAtom, (v) => v + 1)
      } else {
        // unmount
        ref.isMounted = false
        // FIXME As it's not in the batch, we can't schedule it.
        //const syncEffectChannel = ensureBatchChannel(batch)
        //syncEffectChannel.add(() => {
        ref.cleanup?.()
        delete ref.cleanup
        //})
      }
    }
    const originalUpdateHook = internalAtomState.u
    internalAtomState.u = (batch) => {
      originalUpdateHook?.(batch)
      // update
      if (ref.isRefreshing || !ref.isMounted) {
        return
      }
      const syncEffectChannel = ensureBatchChannel(batch)
      syncEffectChannel.add(runEffect)
    }
  }
  return atom((get) => {
    get(internalAtom)
  })
}

type BatchWithSyncEffect = Batch & {
  [syncEffectChannelSymbol]?: Set<() => void>
}
function ensureBatchChannel(batch: BatchWithSyncEffect) {
  // ensure continuation of the flushBatch while loop
  if (!batch[1]) {
    throw new Error('batch[1] must be present')
  }
  if (!batch[syncEffectChannelSymbol]) {
    batch[syncEffectChannelSymbol] = new Set<() => void>()
    const originalForEach = batch[1].forEach
    batch[1].forEach = function (callback) {
      // Inject syncEffect immediately before batch[1]
      batch[syncEffectChannelSymbol]!.forEach(callback)
      originalForEach.call(this, callback)
    }
  }
  return batch[syncEffectChannelSymbol]!
}

/**
 * HACK: steal atomState to synchronously determine if
 * the atom is mounted
 * We return void 0 to cause the buildStore(...args) to throw
 * to abort creating a derived store
 */
function getAtomState(store: Store, atom: AnyAtom): AtomState {
  let atomState: AtomState
  try {
    store.unstable_derive((getAtomState) => {
      atomState = getAtomState(atom)!
      return null as any
    })
  } catch {
    // expect error
  }
  return atomState!
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

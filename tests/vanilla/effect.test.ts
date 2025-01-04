import { expect, it } from 'vitest'
import type { Atom, Getter, Setter } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type GetAtomState = Parameters<Parameters<Store['unstable_derive']>[0]>[0]
type AtomState = NonNullable<ReturnType<GetAtomState>>
type AnyAtom = Atom<unknown>
type Batch = Parameters<NonNullable<AtomState['u']>>[0]

type Cleanup = () => void
type Effect = (get: Getter, set: Setter) => void | Cleanup
type Ref = {
  get: Getter
  set: Setter
  atomState: AtomState
  fromCleanup: boolean
  isMounted: boolean
  inProgress: number
  isRefreshing: number
  init: (get: Getter) => void
  refresh: () => void
  cleanup?: Cleanup | null
  epoch: number
  error?: unknown
}

const sentinelListener = () => {}
const syncEffectChannelSymbol = Symbol()

export function syncEffect(effect: Effect): Atom<void> {
  const refAtom = atom(() => ({ inProgress: 0, epoch: 0 }) as Ref)
  const refreshAtom = atom(0)
  const internalAtom = atom((get) => {
    get(refreshAtom)
    const ref = get(refAtom)
    if (ref.error) {
      const { error } = ref
      delete ref.error
      throw error
    }
    if (!ref.isMounted || (ref.inProgress && !ref.isRefreshing)) {
      return ref.epoch
    }
    if (!ref.isRefreshing) {
      ref.init(get)
    }
    return ++ref.epoch
  })
  internalAtom.unstable_onInit = (store) => {
    const ref = store.get(refAtom)
    ref.refresh = () => {
      try {
        ++ref.isRefreshing
        ref.set(refreshAtom, (v) => v + 1)
      } finally {
        ++ref.isRefreshing
      }
    }
    ref.atomState = getAtomState(store, internalAtom)
    ref.init = (get) => {
      const currDeps = new Map<AnyAtom, unknown>()
      ref.get = (a) => {
        const value = get(a)
        currDeps.set(a, value)
        return value
      }
      ref.set = (a, ...args) => {
        try {
          ++ref.inProgress
          return store.set(a, ...args)
        } finally {
          Array.from(currDeps.keys(), get) // TODO: do we still need this?
          --ref.inProgress
        }
      }
    }
    function runEffect() {
      try {
        ++ref.inProgress
        ref.cleanup?.()
        const cleanup = effectAtom.effect(ref.get!, ref.set!)
        ref.cleanup = cleanup
          ? () => {
              try {
                ref.fromCleanup = true
                cleanup?.()
              } finally {
                ref.fromCleanup = false
              }
            }
          : null
      } catch (e) {
        ref.error = e
        ref.refresh()
        --ref.inProgress
      }
    }
    const originalMountHook = ref.atomState.h
    ref.atomState.h = (batch) => {
      originalMountHook?.(batch)
      if (ref.atomState.m) {
        // mount
        ref.isMounted = true
        store.set(refreshAtom, (v) => v + 1)
      } else {
        // unmount
        ref.isMounted = false
        const syncEffectChannel = ensureBatchChannel(batch)
        syncEffectChannel.add(() => {
          ref.cleanup?.()
          ref.cleanup = null
        })
      }
    }
    const originalUpdateHook = ref.atomState.u
    ref.atomState.u = (batch) => {
      originalUpdateHook?.(batch)
      // update
      if (ref.isRefreshing || !ref.isMounted) {
        return
      }
      const syncEffectChannel = ensureBatchChannel(batch)
      syncEffectChannel.add(runEffect)
    }
  }
  const effectAtom = Object.assign(
    atom((get) => {
      get(internalAtom)
    }),
    { effect },
  )
  return effectAtom
}

type BatchWithSyncEffect = Batch & {
  [syncEffectChannelSymbol]?: Set<() => void>
}
function ensureBatchChannel(batch: BatchWithSyncEffect) {
  // ensure continuation of the flushBatch while loop
  ;(batch[0] ||= new Set())?.add(sentinelListener)
  if (!batch[syncEffectChannelSymbol]) {
    batch[syncEffectChannelSymbol] = new Set<() => void>()
    const originalIterator = batch[Symbol.iterator]
    batch[Symbol.iterator] = function* (): ArrayIterator<Set<() => void>> {
      const iterator = originalIterator.call(this)
      let result = iterator.next()
      let index = 0
      while (!result.done) {
        yield result.value
        // Inject syncEffect immediately after batch[0]
        if (index === 0) {
          yield this[syncEffectChannelSymbol]!
        }
        result = iterator.next()
        index++
      }
    }
  }
  return batch[syncEffectChannelSymbol]
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

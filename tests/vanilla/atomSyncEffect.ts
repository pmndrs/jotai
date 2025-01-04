import type { Atom, Getter, Setter } from 'jotai/vanilla'
import { atom, createStore } from 'jotai/vanilla'

type Store = ReturnType<typeof createStore>
type GetAtomState = Parameters<Parameters<Store['unstable_derive']>[0]>[0]
type AtomState = NonNullable<ReturnType<GetAtomState>>
type AnyAtom = Atom<unknown>
type Batch = Parameters<NonNullable<AtomState['u']>>[0]
type GetterWithPeek = Getter & { peek: Getter }
type SetterWithRecurse = Setter & { recurse: Setter }
type Cleanup = () => void
type Effect = (get: GetterWithPeek, set: SetterWithRecurse) => void | Cleanup
type Ref = {
  get: GetterWithPeek
  set: SetterWithRecurse
  atomState: AtomState
  batches: Map<Batch, Set<() => void>>
  fromCleanup: boolean
  isMounted: boolean
  inProgress: number
  isRecursing: number
  isRefreshing: number
  init: (get: Getter) => void
  refresh: () => void
  cleanup?: Cleanup | null
  epoch: number
  error?: unknown
}

export function syncEffect(effect: Effect): Atom<void> {
  const refAtom = atom(
    () => ({ batches: new WeakMap(), inProgress: 0, epoch: 0 }) as Ref,
  )
  refAtom.debugLabel = 'ref'
  const refreshAtom = atom(0)
  refreshAtom.debugLabel = 'refresh'
  const internalAtom = atom(function internalAtomRead(get) {
    get(refreshAtom)
    const ref = get(refAtom)
    if (ref.error) {
      const { error } = ref
      delete ref.error
      throw error
    }
    if (!ref.isMounted || (ref.inProgress && !ref.isRefreshing)) {
      console.log(':inProgress')
      return ref.epoch
    }
    if (!ref.isRecursing && !ref.isRefreshing) {
      ref.init(get)
    }
    console.log(':read', ref.epoch)
    return ++ref.epoch
  })
  internalAtom.debugLabel = 'internal'
  internalAtom.unstable_onInit = (store) => {
    console.log(':onInit')
    const ref = store.get(refAtom)
    ref.refresh = () => {
      console.log(':refresh')
      try {
        ++ref.isRefreshing
        ref.set(refreshAtom, (v) => v + 1)
      } finally {
        ++ref.isRefreshing
      }
    }
    ref.atomState = getAtomState(store, internalAtom)
    ref.init = (get) => {
      console.log(':init')
      const currDeps = new Map<AnyAtom, unknown>()
      const getter = ((a) => {
        const value = get(a)
        currDeps.set(a, value)
        return value
      }) as GetterWithPeek
      const peek = store.get
      ref.get = Object.assign(getter, { peek })
      const setter: Setter = (a, ...args) => {
        try {
          ++ref.inProgress
          return store.set(a, ...args)
        } finally {
          Array.from(currDeps.keys(), get) // FIXME: why do we need this?
          --ref.inProgress
        }
      }
      const recurse: Setter = (a, ...args) => {
        if (ref.fromCleanup) {
          if (import.meta.env?.MODE !== 'production') {
            throw new Error('set.recurse is not allowed in cleanup')
          }
          return undefined as never
        }
        try {
          ++ref.isRecursing
          return store.set(a, ...args)
        } finally {
          --ref.isRecursing
          const depsChanged = Array.from(currDeps).some(
            ([a, v]) => get(a) !== v,
          )
          if (depsChanged) {
            ref.refresh()
          }
        }
      }
      ref.set = Object.assign(setter, { recurse })
    }
    function runEffect() {
      console.log(':runEffect')
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
      console.log(':mountHook')
      if (ref.atomState.m) {
        // mount
        ref.isMounted = true
        store.set(refreshAtom, (v) => v + 1)
      } else {
        // unmount
        ref.isMounted = false
        const syncEffectChannel = ensureBatchChannel(ref, batch)
        syncEffectChannel.add(function scheduledCleanup() {
          ref.cleanup?.()
          ref.cleanup = null
        })
      }
    }
    const originalUpdateHook = ref.atomState.u
    ref.atomState.u = (batch) => {
      originalUpdateHook?.(batch)
      console.log(':updateHook', ref.isRefreshing, !ref.isMounted)
      // update
      if (ref.isRefreshing || !ref.isMounted) {
        return
      }
      if (ref.isRecursing) {
        runEffect()
      } else {
        const syncEffectChannel = ensureBatchChannel(ref, batch)
        syncEffectChannel.add(function scheduledEffect() {
          runEffect()
        })
      }
    }
  }
  const effectAtom = Object.assign(
    atom(function effectAtomRead(get) {
      get(internalAtom)
    }),
    { effect },
  )
  return effectAtom
}

function ensureBatchChannel(ref: Ref, batch: Batch) {
  if (!ref.batches.has(batch)) {
    const syncEffectChannel = new Set<() => void>()
    ref.batches.set(batch, syncEffectChannel)
    const syncEffectIndex =
      batch.findIndex((channel) => channel === batch.H) + 1
    batch.splice(syncEffectIndex, 0, syncEffectChannel)
  }
  return ref.batches.get(batch)!
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

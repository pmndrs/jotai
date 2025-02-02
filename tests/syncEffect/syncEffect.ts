import type { Atom, Getter, Setter, WritableAtom } from 'jotai/vanilla'
import { atom } from 'jotai/vanilla'
import type {
  INTERNAL_AtomState as AtomState,
  INTERNAL_buildStoreRev1 as buildStore,
} from 'jotai/vanilla/internals'
import {
  INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks,
  INTERNAL_hasInitialValue as hasInitialValue,
  INTERNAL_initializeStoreHooks as initializeStoreHooks,
  INTERNAL_isAtomStateInitialized as isAtomStateInitialized,
  INTERNAL_isSelfAtom as isSelfAtom,
  INTERNAL_returnAtomValue as returnAtomValue,
  INTERNAL_setAtomStateValueOrPromise as setAtomStateValueOrPromise,
} from 'jotai/vanilla/internals'

const getBuildingBlocks = (store: Store) => {
  const buildingBlocks = INTERNAL_getBuildingBlocks(store)
  return [
    buildingBlocks[1], // mountedAtoms
    buildingBlocks[3], // changedAtoms
    initializeStoreHooks(buildingBlocks[6]), // storeHooks
    buildingBlocks[11], // ensureAtomState
    buildingBlocks[14], // readAtomState
    buildingBlocks[16], // writeAtomState
    buildingBlocks[17], // mountDependencies
    buildingBlocks[15], // invalidateDependents
    buildingBlocks[13], // recomputeInvalidatedAtoms
    buildingBlocks[12], // flushCallbacks
  ] as const
}

type Store = ReturnType<typeof buildStore>

type AnyAtom = Atom<unknown>

type GetterWithPeek = Getter & { peek: Getter }

type SetterWithRecurse = Setter & { recurse: Setter }

type Cleanup = () => void

export type Effect = (
  get: GetterWithPeek,
  set: SetterWithRecurse,
) => void | Cleanup

type Ref = [dependencies?: Set<AnyAtom>, atomState?: AtomState<void>]

export function syncEffect(effect: Effect): Atom<void> & { effect: Effect } {
  const refAtom = atom<Ref>(() => [])

  const effectAtom = atom(function effectAtomRead(get) {
    const [dependencies, atomState] = get(refAtom)
    dependencies!.forEach(get)
    ++atomState!.n
  }) as Atom<void> & { effect: Effect }

  effectAtom.effect = effect

  effectAtom.unstable_onInit = (store) => {
    const deps = new Set<AnyAtom>()
    let inProgress = 0
    let isRecursing = false
    let hasChanged = false
    let fromCleanup = false
    let runCleanup: (() => void) | undefined

    function runEffect() {
      if (!mountedAtoms.has(effectAtom) || inProgress || isRecursing) {
        return
      }
      let isSync = true
      deps.clear()

      const getter: GetterWithPeek = (a) => {
        if (fromCleanup) {
          return store.get(a)
        }
        if (isSelfAtom(effectAtom, a)) {
          const aState = ensureAtomState(a)
          if (!isAtomStateInitialized(aState)) {
            if (hasInitialValue(a)) {
              setAtomStateValueOrPromise(a, a.init, ensureAtomState)
            } else {
              // NOTE invalid derived atoms can reach here
              throw new Error('no atom init')
            }
          }
          return returnAtomValue(aState)
        }
        // a !== atom
        const aState = readAtomState(a)
        try {
          return returnAtomValue(aState)
        } finally {
          atomState.d.set(a, aState.n)
          mountedAtoms.get(a)?.t.add(effectAtom)
          if (isSync) {
            deps.add(a)
          } else {
            if (mountedAtoms.has(a)) {
              mountDependencies(effectAtom)
              recomputeInvalidatedAtoms()
              flushCallbacks()
            }
          }
        }
      }

      getter.peek = store.get

      const setter: SetterWithRecurse = <V, As extends unknown[], R>(
        a: WritableAtom<V, As, R>,
        ...args: As
      ) => {
        const aState = ensureAtomState(a)
        try {
          ++inProgress
          if (isSelfAtom(effectAtom, a)) {
            if (!hasInitialValue(a)) {
              // NOTE technically possible but restricted as it may cause bugs
              throw new Error('atom not writable')
            }
            const prevEpochNumber = aState.n
            const v = args[0] as V
            setAtomStateValueOrPromise(a, v, ensureAtomState)
            mountDependencies(a)
            if (prevEpochNumber !== aState.n) {
              changedAtoms.add(a)
              storeHooks.c?.(a)
              invalidateDependents(a)
            }
            return undefined as unknown as R
          } else {
            return writeAtomState(a, ...args)
          }
        } finally {
          if (!isSync) {
            recomputeInvalidatedAtoms()
            flushCallbacks()
          }
          --inProgress
        }
      }

      setter.recurse = (a, ...args) => {
        if (fromCleanup) {
          if (import.meta.env?.MODE !== 'production') {
            throw new Error('set.recurse is not allowed in cleanup')
          }
          return undefined as any
        }
        try {
          isRecursing = true
          mountDependencies(effectAtom)
          return setter(a, ...args)
        } finally {
          recomputeInvalidatedAtoms()
          isRecursing = false
          if (hasChanged) {
            hasChanged = false
            runEffect()
          }
        }
      }

      try {
        runCleanup?.()
        const cleanup = effectAtom.effect(getter, setter)
        if (typeof cleanup !== 'function') {
          return
        }
        runCleanup = () => {
          if (inProgress) {
            return
          }
          try {
            isSync = true
            fromCleanup = true
            return cleanup()
          } finally {
            isSync = false
            fromCleanup = false
            runCleanup = undefined
          }
        }
      } finally {
        isSync = false
        mountDependencies(effectAtom)
        recomputeInvalidatedAtoms()
      }
    }

    const [
      mountedAtoms,
      changedAtoms,
      storeHooks,
      ensureAtomState,
      readAtomState,
      writeAtomState,
      mountDependencies,
      invalidateDependents,
      recomputeInvalidatedAtoms,
      flushCallbacks,
    ] = getBuildingBlocks(store)
    const syncEffectChannel = ensureSyncEffectChannel(store)
    const atomState = ensureAtomState(effectAtom)

    Object.assign(store.get(refAtom), [deps, atomState])

    storeHooks.m.add(effectAtom, function atomOnMount() {
      // mounted
      syncEffectChannel.add(runEffect)
    })

    storeHooks.u.add(effectAtom, function atomOnUnmount() {
      // unmounted
      if (runCleanup) {
        syncEffectChannel.add(runCleanup)
      }
    })

    storeHooks.c.add(effectAtom, function atomOnUpdate() {
      // changed
      if (isRecursing) {
        hasChanged = true
        return
      }
      syncEffectChannel.add(runEffect)
    })
  }

  if (import.meta.env?.MODE !== 'production') {
    Object.defineProperty(refAtom, 'debugLabel', {
      get: () =>
        effectAtom.debugLabel ? `${effectAtom.debugLabel}:ref` : undefined,
    })
    refAtom.debugPrivate = true
  }

  return effectAtom
}

const syncEffectChannelStoreMap = new WeakMap<Store, Set<() => void>>()

function ensureSyncEffectChannel(store: unknown) {
  const storeHooks = getBuildingBlocks(store as Store)[2]
  let syncEffectChannel = syncEffectChannelStoreMap.get(store as Store)
  if (!syncEffectChannel) {
    syncEffectChannel = new Set<() => void>()
    syncEffectChannelStoreMap.set(store as Store, syncEffectChannel)
    const call = (fn: () => void) => fn()
    storeHooks.f.add(function storeOnFlush() {
      // flush
      syncEffectChannel!.forEach(call)
      syncEffectChannel!.clear()
    })
  }
  return syncEffectChannel
}

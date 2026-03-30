/**
 * Experiment: exp-no-building-blocks
 * Strategy: remove runtime building-block tuple dispatch and read store state
 * from a direct per-store internals object.
 * Expected effect:
 * - Reduce repeated tuple lookup/index overhead on hot paths.
 */

// Internal functions (subject to change without notice)
// In case you rely on them, be sure to pin the version

import type { Atom, WritableAtom } from './atom.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]
type EpochNumber = number

/**
 * Mutable atom state,
 * tracked for both mounted and unmounted atoms in a store.
 *
 * This should be garbage collectable.
 * We can mutate it during atom read. (except for fields with TODO)
 */
type AtomState<Value = AnyValue> = {
  /**
   * Map of atoms that the atom depends on.
   * The map value is the epoch number of the dependency.
   */
  readonly d: Map<AnyAtom, EpochNumber>
  /**
   * Set of atoms with pending promise that depend on the atom.
   *
   * This may cause memory leaks, but it's for the capability to continue promises
   * TODO(daishi): revisit how to handle this
   */
  readonly p: Set<AnyAtom>
  /** The epoch number of the atom. */
  n: EpochNumber
  /** The store epoch number that last validated the atom. */
  m?: EpochNumber
  /** Atom value */
  v?: Value
  /** Atom error */
  e?: AnyError
}

/**
 * State tracked for mounted atoms. An atom is considered "mounted" if it has a
 * subscriber, or is a transitive dependency of another atom that has a
 * subscriber.
 * The mounted state of an atom is freed once it is no longer mounted.
 */
type Mounted = {
  /** Set of listeners to notify when the atom value changes. */
  readonly l: Set<() => void>
  /** Set of mounted atoms that the atom depends on. */
  readonly d: Set<AnyAtom>
  /** Set of mounted atoms that depends on the atom. */
  readonly t: Set<AnyAtom>
  /** Function to run when the atom is unmounted. */
  u?: () => void
}

type WeakMapLike<K extends object, V> = {
  get(key: K): V | undefined
  set(key: K, value: V): void
  has(key: K): boolean
  delete(key: K): boolean
}

type SetLike<T> = {
  readonly size: number
  add(value: T): void
  has(value: T): boolean
  delete(value: T): boolean
  clear(): void
  forEach(callback: (value: T) => void): void
  [Symbol.iterator](): IterableIterator<T>
}

type AtomStateMap = WeakMapLike<AnyAtom, AtomState>
type MountedMap = WeakMapLike<AnyAtom, Mounted>
type InvalidatedAtoms = WeakMapLike<AnyAtom, EpochNumber>
type ChangedAtoms = SetLike<AnyAtom>
type Callbacks = SetLike<() => void>

type AtomRead = <Value>(
  store: Store,
  atom: Atom<Value>,
  ...params: Parameters<Atom<Value>['read']>
) => Value
type AtomWrite = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  ...params: Parameters<WritableAtom<Value, Args, Result>['write']>
) => Result
type AtomOnInit = <Value>(store: Store, atom: Atom<Value>) => void
type AtomOnMount = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  setAtom: (...args: Args) => Result,
) => OnUnmount | void

type EnsureAtomState = <Value>(
  store: Store,
  atom: Atom<Value>,
) => AtomState<Value>
type FlushCallbacks = (store: Store) => void
type RecomputeInvalidatedAtoms = (store: Store) => void
type ReadAtomState = <Value>(
  store: Store,
  atom: Atom<Value>,
) => AtomState<Value>
type InvalidateDependents = (store: Store, atom: AnyAtom) => void
type WriteAtomState = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
type MountDependencies = (store: Store, atom: AnyAtom) => void
type MountAtom = <Value>(store: Store, atom: Atom<Value>) => Mounted
type UnmountAtom = <Value>(
  store: Store,
  atom: Atom<Value>,
) => Mounted | undefined
type SetAtomStateValueOrPromise = <Value>(
  store: Store,
  atom: Atom<Value>,
  valueOrPromise: Value,
) => void
type StoreGet = <Value>(store: Store, atom: Atom<Value>) => Value
type StoreSet = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
type StoreSub = (
  store: Store,
  atom: AnyAtom,
  listener: () => void,
) => () => void
type EnhanceBuildingBlocks = (buildingBlocks: BuildingBlocks) => BuildingBlocks
type AbortHandlersMap = WeakMapLike<PromiseLike<unknown>, Set<() => void>>
type RegisterAbortHandler = <T>(
  store: Store,
  promise: PromiseLike<T>,
  abortHandler: () => void,
) => void
type AbortPromise = <T>(store: Store, promise: PromiseLike<T>) => void
type StoreEpochHolder = [n: EpochNumber]

type Store = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
}

type BuildingBlocks = [
  // store state
  atomStateMap: AtomStateMap, //                               0
  mountedStateByAtom: MountedMap, //                           1
  invalidatedAtoms: InvalidatedAtoms, //                       2
  changedAtoms: ChangedAtoms, //                               3
  mountCallbacks: Callbacks, //                                4
  unmountCallbacks: Callbacks, //                              5
  storeHooks: StoreHooks, //                                   6
  // atom interceptors
  atomRead: AtomRead, //                                       7
  atomWrite: AtomWrite, //                                     8
  atomOnInit: AtomOnInit, //                                   9
  atomOnMount: AtomOnMount, //                                 10
  // building-block functions
  ensureAtomState: EnsureAtomState, //                         11
  flushCallbacks: FlushCallbacks, //                           12
  recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms, //     13
  readAtomState: ReadAtomState, //                             14
  invalidateDependents: InvalidateDependents, //               15
  writeAtomState: WriteAtomState, //                           16
  mountDependencies: MountDependencies, //                     17
  mountAtom: MountAtom, //                                     18
  unmountAtom: UnmountAtom, //                                 19
  setAtomStateValueOrPromise: SetAtomStateValueOrPromise, //   20
  // store api
  storeGet: StoreGet, //                                       21
  storeSet: StoreSet, //                                       22
  storeSub: StoreSub, //                                       23
  enhanceBuildingBlocks: EnhanceBuildingBlocks | undefined, // 24
  // abortable promise support
  abortHandlersMap: AbortHandlersMap, //                       25
  registerAbortHandler: RegisterAbortHandler, //               26
  abortPromise: AbortPromise, //                               27
  // store epoch
  storeEpochHolder: StoreEpochHolder, //                       28
]

export type {
  AtomState as INTERNAL_AtomState,
  Mounted as INTERNAL_Mounted,
  AtomStateMap as INTERNAL_AtomStateMap,
  MountedMap as INTERNAL_MountedMap,
  InvalidatedAtoms as INTERNAL_InvalidatedAtoms,
  ChangedAtoms as INTERNAL_ChangedAtoms,
  Callbacks as INTERNAL_Callbacks,
  AtomRead as INTERNAL_AtomRead,
  AtomWrite as INTERNAL_AtomWrite,
  AtomOnInit as INTERNAL_AtomOnInit,
  AtomOnMount as INTERNAL_AtomOnMount,
  EnsureAtomState as INTERNAL_EnsureAtomState,
  FlushCallbacks as INTERNAL_FlushCallbacks,
  RecomputeInvalidatedAtoms as INTERNAL_RecomputeInvalidatedAtoms,
  ReadAtomState as INTERNAL_ReadAtomState,
  InvalidateDependents as INTERNAL_InvalidateDependents,
  WriteAtomState as INTERNAL_WriteAtomState,
  MountDependencies as INTERNAL_MountDependencies,
  MountAtom as INTERNAL_MountAtom,
  UnmountAtom as INTERNAL_UnmountAtom,
  Store as INTERNAL_Store,
  BuildingBlocks as INTERNAL_BuildingBlocks,
  StoreHooks as INTERNAL_StoreHooks,
}

//
// Some util functions
//

function hasInitialValue<T extends Atom<AnyValue>>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) {
  return 'init' in atom
}

function isActuallyWritableAtom(atom: AnyAtom): atom is AnyWritableAtom {
  return !!(atom as AnyWritableAtom).write
}

function isAtomStateInitialized<Value>(atomState: AtomState<Value>): boolean {
  return 'v' in atomState || 'e' in atomState
}

function returnAtomValue<Value>(atomState: AtomState<Value>): Value {
  if ('e' in atomState) {
    throw atomState.e
  }
  if (import.meta.env?.MODE !== 'production' && !('v' in atomState)) {
    throw new Error('[Bug] atom state is not initialized')
  }
  return atomState.v!
}

function isPromiseLike(p: unknown): p is PromiseLike<unknown> {
  return typeof (p as any)?.then === 'function'
}

function addPendingPromiseToDependency(
  atom: AnyAtom,
  promise: PromiseLike<AnyValue>,
  dependencyAtomState: AtomState,
): void {
  if (!dependencyAtomState.p.has(atom)) {
    dependencyAtomState.p.add(atom)
    const cleanup = () => dependencyAtomState.p.delete(atom)
    promise.then(cleanup, cleanup)
  }
}

function getMountedOrPendingDependents(
  atom: AnyAtom,
  atomState: AtomState,
  mountedMap: MountedMap,
): Iterable<AnyAtom> {
  const dependents = new Set<AnyAtom>()
  for (const a of mountedMap.get(atom)?.t || []) {
    dependents.add(a)
  }
  for (const atomWithPendingPromise of atomState.p) {
    dependents.add(atomWithPendingPromise)
  }
  return dependents
}

//
// Store hooks
//

type StoreHook = {
  (): void
  add(callback: () => void): () => void
}

type StoreHookForAtoms = {
  (atom: AnyAtom): void
  add(atom: AnyAtom, callback: () => void): () => void
  add(atom: undefined, callback: (atom: AnyAtom) => void): () => void
}

/** StoreHooks are an experimental API. */
type StoreHooks = {
  /** Listener to notify when the atom state is created. */
  readonly i?: StoreHookForAtoms
  /** Listener to notify when the atom is read. */
  readonly r?: StoreHookForAtoms
  /** Listener to notify when the atom value is changed. */
  readonly c?: StoreHookForAtoms
  /** Listener to notify when the atom is mounted. */
  readonly m?: StoreHookForAtoms
  /** Listener to notify when the atom is unmounted. */
  readonly u?: StoreHookForAtoms
  /** Listener to notify when callbacks are being flushed. */
  readonly f?: StoreHook
}

const createStoreHook = (): StoreHook => {
  const callbacks = new Set<() => void>()
  const notify = () => callbacks.forEach((fn) => fn())
  notify.add = (fn: () => void) => {
    callbacks.add(fn)
    return () => callbacks.delete(fn)
  }
  return notify
}

const createStoreHookForAtoms = (): StoreHookForAtoms => {
  const all: object = {}
  const callbacks = new WeakMap<
    AnyAtom | typeof all,
    Set<(atom?: AnyAtom) => void>
  >()
  const notify = (atom: AnyAtom) => {
    callbacks.get(all)?.forEach((fn) => fn(atom))
    callbacks.get(atom)?.forEach((fn) => fn())
  }
  notify.add = (atom: AnyAtom | undefined, fn: (atom?: AnyAtom) => void) => {
    const key = atom || all
    let fns = callbacks.get(key)
    if (!fns) {
      fns = new Set()
      callbacks.set(key, fns)
    }
    fns.add(fn)
    return () => {
      fns!.delete(fn)
      if (!fns!.size) {
        callbacks.delete(key)
      }
    }
  }
  return notify as StoreHookForAtoms
}

function initializeStoreHooks(storeHooks: StoreHooks): Required<StoreHooks> {
  type SH = { -readonly [P in keyof StoreHooks]: StoreHooks[P] }
  ;(storeHooks as SH).i ||= createStoreHookForAtoms()
  ;(storeHooks as SH).r ||= createStoreHookForAtoms()
  ;(storeHooks as SH).c ||= createStoreHookForAtoms()
  ;(storeHooks as SH).m ||= createStoreHookForAtoms()
  ;(storeHooks as SH).u ||= createStoreHookForAtoms()
  ;(storeHooks as SH).f ||= createStoreHook()
  return storeHooks as Required<StoreHooks>
}

//
// Main functions
//

// Compatibility helper retained for internal export shape.
function getBuildingBlocks(_store: Store): BuildingBlocks {
  throw new Error(
    'INTERNAL_getBuildingBlocksRev2 is disabled in exp-no-building-blocks.',
  )
}

function buildStore(): Store {
  const atomStateMap: AtomStateMap = new WeakMap()
  const mountedMap: MountedMap = new WeakMap()
  const invalidatedAtoms: InvalidatedAtoms = new WeakMap()
  const changedAtoms: ChangedAtoms = new Set()
  const mountCallbacks: Callbacks = new Set()
  const unmountCallbacks: Callbacks = new Set()
  const storeHooks: StoreHooks = {}
  const abortHandlersMap: AbortHandlersMap = new WeakMap()
  const storeEpochHolder: StoreEpochHolder = [0]

  const ensureAtomState = <Value>(atom: Atom<Value>) => {
    if (import.meta.env?.MODE !== 'production' && !atom) {
      throw new Error('Atom is undefined or null')
    }
    let atomState = atomStateMap.get(atom)
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      atomStateMap.set(atom, atomState)
      storeHooks.i?.(atom)
      atom.INTERNAL_onInit?.(store)
    }
    return atomState as AtomState<Value>
  }

  const flushCallbacks = () => {
    const errors: unknown[] = []
    const call = (fn: () => void) => {
      try {
        fn()
      } catch (e) {
        errors.push(e)
      }
    }
    do {
      if (storeHooks.f) {
        call(storeHooks.f)
      }
      const callbacks = new Set<() => void>()
      const add = callbacks.add.bind(callbacks)
      changedAtoms.forEach((atom) => mountedMap.get(atom)?.l.forEach(add))
      changedAtoms.clear()
      unmountCallbacks.forEach(add)
      unmountCallbacks.clear()
      mountCallbacks.forEach(add)
      mountCallbacks.clear()
      callbacks.forEach(call)
      if (changedAtoms.size) {
        recomputeInvalidatedAtoms()
      }
    } while (changedAtoms.size || unmountCallbacks.size || mountCallbacks.size)
    if (errors.length) {
      throw new AggregateError(errors)
    }
  }

  const recomputeInvalidatedAtoms = () => {
    // Step 1: traverse the dependency graph to build the topologically sorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
    const topSortedReversed: [atom: AnyAtom, atomState: AtomState][] = []
    const visiting = new WeakSet<AnyAtom>()
    const visited = new WeakSet<AnyAtom>()
    // Visit the root atom. This is the only atom in the dependency graph
    // without incoming edges, which is one reason we can simplify the algorithm
    const stack: AnyAtom[] = Array.from(changedAtoms)
    while (stack.length) {
      const a = stack[stack.length - 1]!
      const aState = ensureAtomState(a)
      if (visited.has(a)) {
        // All dependents have been processed, now process this atom
        stack.pop()
        continue
      }
      if (visiting.has(a)) {
        // The algorithm calls for pushing onto the front of the list. For
        // performance, we will simply push onto the end, and then will iterate in
        // reverse order later.
        if (invalidatedAtoms.get(a) === aState.n) {
          topSortedReversed.push([a, aState])
        } else if (
          import.meta.env?.MODE !== 'production' &&
          invalidatedAtoms.has(a)
        ) {
          throw new Error('[Bug] invalidated atom exists')
        }
        // Atom has been visited but not yet processed
        visited.add(a)
        stack.pop()
        continue
      }
      visiting.add(a)
      // Push unvisited dependents onto the stack
      for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
        if (!visiting.has(d)) {
          stack.push(d)
        }
      }
    }
    // Step 2: use the topSortedReversed atom list to recompute all affected atoms
    // Track what's changed, so that we can short circuit when possible
    for (let i = topSortedReversed.length - 1; i >= 0; --i) {
      const [a, aState] = topSortedReversed[i]!
      let hasChangedDeps = false
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        invalidatedAtoms.set(a, aState.n)
        readAtomState(a)
        mountDependencies(a)
      }
      invalidatedAtoms.delete(a)
    }
  }

  // Dev only
  const storeMutationSet = new WeakSet<Store>()

  const readAtomState = <Value>(atom: Atom<Value>) => {
    const atomState = ensureAtomState(atom)
    const storeEpochNumber = storeEpochHolder[0]
    // See if we can skip recomputing this atom.
    if (isAtomStateInitialized(atomState)) {
      if (
        // If the atom is mounted, we can use cached atom state,
        // because it should have been updated by dependencies.
        // We can't use the cache if the atom is invalidated.
        (mountedMap.has(atom) && invalidatedAtoms.get(atom) !== atomState.n) ||
        // If atom is not mounted, we can use cached atom state,
        // only if store hasn't been mutated.
        atomState.m === storeEpochNumber
      ) {
        atomState.m = storeEpochNumber
        return atomState as AtomState<Value>
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      let hasChangedDeps = false
      for (const [a, n] of atomState.d) {
        if (readAtomState(a).n !== n) {
          hasChangedDeps = true
          break
        }
      }
      if (!hasChangedDeps) {
        atomState.m = storeEpochNumber
        return atomState as AtomState<Value>
      }
    }
    // Compute a new state for this atom.
    let isSync = true
    const prevDeps = new Set<AnyAtom>(atomState.d.keys())
    const nextDeps = new Map<AnyAtom, EpochNumber>()
    const pruneDependencies = () => {
      for (const a of prevDeps) {
        if (!nextDeps.has(a)) {
          atomState.d.delete(a)
        }
      }
    }
    const mountDependenciesIfAsync = () => {
      if (mountedMap.has(atom)) {
        // If changedAtoms is already populated, an outer recompute cycle will handle it
        const shouldRecompute = !changedAtoms.size
        mountDependencies(atom)
        if (shouldRecompute) {
          recomputeInvalidatedAtoms()
          flushCallbacks()
        }
      }
    }
    const getter = <V>(a: Atom<V>) => {
      if (a === (atom as AnyAtom)) {
        const aState = ensureAtomState(a)
        if (!isAtomStateInitialized(aState)) {
          if (hasInitialValue(a)) {
            setAtomStateValueOrPromise(a, a.init)
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
        nextDeps.set(a, aState.n)
        atomState.d.set(a, aState.n)
        if (isPromiseLike(atomState.v)) {
          addPendingPromiseToDependency(atom, atomState.v, aState)
        }
        if (mountedMap.has(atom)) {
          mountedMap.get(a)?.t.add(atom)
        }
        if (!isSync) {
          mountDependenciesIfAsync()
        }
      }
    }
    let controller: AbortController | undefined
    let setSelf: ((...args: unknown[]) => unknown) | undefined
    const options = {
      get signal() {
        if (!controller) {
          controller = new AbortController()
        }
        return controller.signal
      },
      get setSelf() {
        if (import.meta.env?.MODE !== 'production') {
          // This is shown even before calling. It's a strong warning.
          console.warn(
            '[DEPRECATED] setSelf is deprecated and will be removed in v3.',
          )
        }
        if (
          import.meta.env?.MODE !== 'production' &&
          !isActuallyWritableAtom(atom)
        ) {
          console.warn('setSelf function cannot be used with read-only atom')
        }
        if (!setSelf && isActuallyWritableAtom(atom)) {
          setSelf = (...args) => {
            if (import.meta.env?.MODE !== 'production' && isSync) {
              console.warn('setSelf function cannot be called in sync')
            }
            if (!isSync) {
              try {
                return writeAtomState(atom, ...args)
              } finally {
                recomputeInvalidatedAtoms()
                flushCallbacks()
              }
            }
          }
        }
        return setSelf
      },
    }
    const prevEpochNumber = atomState.n
    const prevInvalidated = invalidatedAtoms.get(atom) === prevEpochNumber
    try {
      if (import.meta.env?.MODE !== 'production') {
        storeMutationSet.delete(store)
      }
      const valueOrPromise = atom.read(getter, options as never)
      if (
        import.meta.env?.MODE !== 'production' &&
        storeMutationSet.has(store)
      ) {
        console.warn(
          'Detected store mutation during atom read. This is not supported.',
        )
      }
      setAtomStateValueOrPromise(atom, valueOrPromise)
      if (isPromiseLike(valueOrPromise)) {
        registerAbortHandler(valueOrPromise, () => controller?.abort())
        const settle = () => {
          pruneDependencies()
          mountDependenciesIfAsync()
        }
        valueOrPromise.then(settle, settle)
      } else {
        pruneDependencies()
      }
      storeHooks.r?.(atom)
      atomState.m = storeEpochNumber
      return atomState as AtomState<Value>
    } catch (error) {
      delete atomState.v
      atomState.e = error
      ++atomState.n
      atomState.m = storeEpochNumber
      return atomState as AtomState<Value>
    } finally {
      isSync = false
      if (atomState.n !== prevEpochNumber && prevInvalidated) {
        invalidatedAtoms.set(atom, atomState.n)
        changedAtoms.add(atom)
        storeHooks.c?.(atom)
      }
    }
  }

  const invalidateDependents = (atom: AnyAtom) => {
    const stack: AnyAtom[] = [atom]
    while (stack.length) {
      const a = stack.pop()!
      const aState = ensureAtomState(a)
      for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
        const dState = ensureAtomState(d)
        if (invalidatedAtoms.get(d) !== dState.n) {
          invalidatedAtoms.set(d, dState.n)
          stack.push(d)
        }
      }
    }
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => returnAtomValue(readAtomState(a))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      const aState = ensureAtomState(a)
      try {
        if (a === (atom as AnyAtom)) {
          if (!hasInitialValue(a)) {
            // NOTE technically possible but restricted as it may cause bugs
            throw new Error('atom not writable')
          }
          if (import.meta.env?.MODE !== 'production') {
            storeMutationSet.add(store)
          }
          const prevEpochNumber = aState.n
          const v = args[0] as V
          setAtomStateValueOrPromise(a, v)
          mountDependencies(a)
          if (prevEpochNumber !== aState.n) {
            ++storeEpochHolder[0]
            changedAtoms.add(a)
            invalidateDependents(a)
            storeHooks.c?.(a)
          }
          return undefined as R
        } else {
          return writeAtomState(a, ...args)
        }
      } finally {
        if (!isSync) {
          recomputeInvalidatedAtoms()
          flushCallbacks()
        }
      }
    }
    try {
      return atom.write(getter, setter, ...args)
    } finally {
      isSync = false
    }
  }

  const mountDependencies = (atom: AnyAtom) => {
    const atomState = ensureAtomState(atom)
    const mounted = mountedMap.get(atom)
    if (mounted) {
      for (const [a, n] of atomState.d) {
        if (!mounted.d.has(a)) {
          const aState = ensureAtomState(a)
          const aMounted = mountAtom(a)
          aMounted.t.add(atom)
          mounted.d.add(a)
          if (n !== aState.n) {
            changedAtoms.add(a)
            invalidateDependents(a)
            storeHooks.c?.(a)
          }
        }
      }
      for (const a of mounted.d) {
        if (!atomState.d.has(a)) {
          mounted.d.delete(a)
          const aMounted = unmountAtom(a)
          aMounted?.t.delete(atom)
        }
      }
    }
  }

  const mountAtom = <Value>(atom: Atom<Value>) => {
    const atomState = ensureAtomState(atom)
    let mounted = mountedMap.get(atom)
    if (!mounted) {
      // recompute atom state
      readAtomState(atom)
      // mount dependencies first
      for (const a of atomState.d.keys()) {
        const aMounted = mountAtom(a)
        aMounted.t.add(atom)
      }
      // mount self
      mounted = {
        l: new Set(),
        d: new Set(atomState.d.keys()),
        t: new Set(),
      }
      mountedMap.set(atom, mounted)
      if (isActuallyWritableAtom(atom)) {
        const processOnMount = () => {
          let isSync = true
          const setAtom = (...args: unknown[]) => {
            try {
              return writeAtomState(atom, ...args)
            } finally {
              if (!isSync) {
                recomputeInvalidatedAtoms()
                flushCallbacks()
              }
            }
          }
          try {
            const onUnmount = atom.onMount?.(setAtom)
            if (onUnmount) {
              mounted!.u = () => {
                isSync = true
                try {
                  onUnmount()
                } finally {
                  isSync = false
                }
              }
            }
          } finally {
            isSync = false
          }
        }
        mountCallbacks.add(processOnMount)
      }
      storeHooks.m?.(atom)
    }
    return mounted
  }

  const unmountAtom = <Value>(atom: Atom<Value>) => {
    const atomState = ensureAtomState(atom)
    let mounted = mountedMap.get(atom)
    if (!mounted || mounted.l.size) {
      return mounted
    }
    let isDependent = false
    for (const a of mounted.t) {
      if (mountedMap.get(a)?.d.has(atom)) {
        isDependent = true
        break
      }
    }
    if (!isDependent) {
      // unmount self
      if (mounted.u) {
        unmountCallbacks.add(mounted.u)
      }
      mounted = undefined
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        const aMounted = unmountAtom(a)
        aMounted?.t.delete(atom)
      }
      storeHooks.u?.(atom)
      return undefined
    }
    return mounted
  }

  const setAtomStateValueOrPromise = <Value>(
    atom: Atom<Value>,
    valueOrPromise: Value,
  ) => {
    const atomState = ensureAtomState(atom)
    const hasPrevValue = 'v' in atomState
    const prevValue = atomState.v
    if (isPromiseLike(valueOrPromise)) {
      for (const a of atomState.d.keys()) {
        addPendingPromiseToDependency(atom, valueOrPromise, ensureAtomState(a))
      }
    }
    atomState.v = valueOrPromise
    delete atomState.e
    if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
      ++atomState.n
      if (isPromiseLike(prevValue)) {
        abortPromise(prevValue)
      }
    }
  }

  const storeGet = <Value>(atom: Atom<Value>) => {
    return returnAtomValue(readAtomState(atom)) as any
  }

  const storeSet = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => {
    const prevChangedAtomsSize = changedAtoms.size
    try {
      return writeAtomState(atom, ...args) as any
    } finally {
      if (changedAtoms.size !== prevChangedAtomsSize) {
        recomputeInvalidatedAtoms()
        flushCallbacks()
      }
    }
  }

  const storeSub = (atom: AnyAtom, listener: () => void) => {
    const mounted = mountAtom(atom)
    const listeners = mounted.l
    listeners.add(listener)
    flushCallbacks()
    return () => {
      listeners.delete(listener)
      unmountAtom(atom)
      flushCallbacks()
    }
  }

  const registerAbortHandler = <T>(
    promise: PromiseLike<T>,
    abortHandler: () => void,
  ) => {
    let abortHandlers = abortHandlersMap.get(promise)
    if (!abortHandlers) {
      abortHandlers = new Set()
      abortHandlersMap.set(promise, abortHandlers)
      const cleanup = () => abortHandlersMap.delete(promise)
      promise.then(cleanup, cleanup)
    }
    abortHandlers.add(abortHandler)
  }

  const abortPromise = <T>(promise: PromiseLike<T>) => {
    const abortHandlers = abortHandlersMap.get(promise)
    abortHandlers?.forEach((fn) => fn())
  }

  const store = {
    get(atom) {
      return storeGet(atom)
    },
    set(atom, ...args) {
      return storeSet(atom, ...args)
    },
    sub(atom, listener) {
      return storeSub(atom, listener)
    },
  } as Store

  return store
}

export {
  //
  // Export internal functions
  //
  buildStore as INTERNAL_buildStoreRev2,
  getBuildingBlocks as INTERNAL_getBuildingBlocksRev2,
  initializeStoreHooks as INTERNAL_initializeStoreHooksRev2,

  //
  // Still experimental and some of them will be gone soon
  //
  hasInitialValue as INTERNAL_hasInitialValue,
  isActuallyWritableAtom as INTERNAL_isActuallyWritableAtom,
  isAtomStateInitialized as INTERNAL_isAtomStateInitialized,
  returnAtomValue as INTERNAL_returnAtomValue,
  isPromiseLike as INTERNAL_isPromiseLike,
  addPendingPromiseToDependency as INTERNAL_addPendingPromiseToDependency,
  getMountedOrPendingDependents as INTERNAL_getMountedOrPendingDependents,
}

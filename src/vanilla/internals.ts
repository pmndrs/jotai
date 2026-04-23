// Internal functions (subject to change without notice)
// In case you rely on them, be sure to pin the version

import type { Atom, WritableAtom } from './atom.ts'
import type { ExtractAtomArgs, ExtractAtomResult } from './typeUtils.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type WithOnMount<Args extends unknown[], Result> = {
  onMount: NonNullable<WritableAtom<AnyValue, Args, Result>['onMount']>
}
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
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
  ...params: Parameters<Atom<Value>['read']>
) => Value
type AtomWrite = <Value, Args extends unknown[], Result>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  ...params: Parameters<WritableAtom<Value, Args, Result>['write']>
) => Result
type AtomOnInit = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => void
type AtomOnMount = <Value, Args extends unknown[], Result>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: WritableAtom<Value, Args, Result> & WithOnMount<Args, Result>,
  setAtom: (...args: Args) => Result,
) => OnUnmount | void

type EnsureAtomState = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => AtomState<Value>
type FlushCallbacks = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
) => void
type RecomputeInvalidatedAtoms = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
) => void
type ReadAtomState = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => AtomState<Value>
type InvalidateDependents = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: AnyAtom,
) => void
type WriteAtomState = <Value, Args extends unknown[], Result>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  args: Args,
) => Result
type MountDependencies = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: AnyAtom,
) => void
type MountAtom = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => Mounted
type UnmountAtom = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => Mounted | undefined
type SetAtomStateValueOrPromise = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
  valueOrPromise: Value,
) => void
type StoreGet = <Value>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: Atom<Value>,
) => Value
type StoreSet = <Value, Args extends unknown[], Result>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
type StoreSub = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  atom: AnyAtom,
  listener: () => void,
) => () => void
type EnhanceBuildingBlocks = (
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
) => Readonly<BuildingBlocks>
type AbortHandlersMap = WeakMapLike<PromiseLike<unknown>, Set<() => void>>
type RegisterAbortHandler = <T>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  promise: PromiseLike<T>,
  abortHandler: () => void,
) => void
type AbortPromise = <T>(
  buildingBlocks: Readonly<BuildingBlocks>,
  store: Store,
  promise: PromiseLike<T>,
) => void
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
  mountedMap: MountedMap, //                                   1
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

function hasInitialValue<T extends AnyAtom>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) {
  return 'init' in atom
}

type ActuallyWritableAtom<T extends AnyAtom> =
  T extends WritableAtom<infer V, infer A, infer R>
    ? T & WritableAtom<V, A, R>
    : T extends Atom<infer V>
      ? T & WritableAtom<V, unknown[], unknown>
      : never

function isActuallyWritableAtom<T extends AnyAtom>(
  atom: T,
): atom is ActuallyWritableAtom<T> {
  return typeof (atom as { write?: unknown }).write === 'function'
}

function hasOnMount<T extends AnyWritableAtom>(
  atom: T,
): atom is T & WithOnMount<ExtractAtomArgs<T>, ExtractAtomResult<T>> {
  return !!atom.onMount
}

function isAtomStateInitialized(atomState: AtomState<AnyValue>): boolean {
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
  return typeof (p as PromiseLike<unknown>)?.then === 'function'
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
  const mounted = mountedMap.get(atom)
  const mountedDependents = mounted?.t
  const pendingDependents = atomState.p
  if (!mountedDependents?.size) {
    return pendingDependents
  }
  if (!pendingDependents.size) {
    return mountedDependents
  }
  // only pay the union cost when both sides are non-empty
  const dependents = new Set<AnyAtom>(mountedDependents)
  for (const a of pendingDependents) {
    dependents.add(a)
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

const BUILDING_BLOCK_atomRead: AtomRead = (
  _buildingBlocks,
  _store,
  atom,
  ...params
) => atom.read(...params)
const BUILDING_BLOCK_atomWrite: AtomWrite = (
  _buildingBlocks,
  _store,
  atom,
  ...params
) => atom.write(...params)
const BUILDING_BLOCK_atomOnInit: AtomOnInit = (_buildingBlocks, store, atom) =>
  atom.INTERNAL_onInit?.(store)
const BUILDING_BLOCK_atomOnMount: AtomOnMount = (
  _buildingBlocks,
  _store,
  atom,
  setAtom,
) => atom.onMount?.(setAtom)

const BUILDING_BLOCK_ensureAtomState: EnsureAtomState = (
  buildingBlocks,
  store,
  atom,
) => {
  const atomStateMap = buildingBlocks[0]
  const storeHooks = buildingBlocks[6]
  const atomOnInit = buildingBlocks[9]
  if (import.meta.env?.MODE !== 'production' && !atom) {
    throw new Error('Atom is undefined or null')
  }
  let atomState = atomStateMap.get(atom)
  if (!atomState) {
    atomState = { d: new Map(), p: new Set(), n: 0 }
    atomStateMap.set(atom, atomState)
    storeHooks.i?.(atom)
    atomOnInit?.(buildingBlocks, store, atom)
  }
  return atomState as never
}

const BUILDING_BLOCK_flushCallbacks: FlushCallbacks = (
  buildingBlocks,
  store,
) => {
  const mountedMap = buildingBlocks[1]
  const changedAtoms = buildingBlocks[3]
  const mountCallbacks = buildingBlocks[4]
  const unmountCallbacks = buildingBlocks[5]
  const storeHooks = buildingBlocks[6]
  const recomputeInvalidatedAtoms = buildingBlocks[13]
  if (
    !storeHooks.f &&
    !changedAtoms.size &&
    !mountCallbacks.size &&
    !unmountCallbacks.size
  ) {
    return
  }
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
    for (const atom of changedAtoms) {
      const listeners = mountedMap.get(atom)?.l
      if (listeners) {
        for (const listener of listeners) {
          callbacks.add(listener)
        }
      }
    }
    changedAtoms.clear()
    for (const fn of unmountCallbacks) {
      callbacks.add(fn)
    }
    unmountCallbacks.clear()
    for (const fn of mountCallbacks) {
      callbacks.add(fn)
    }
    mountCallbacks.clear()
    for (const fn of callbacks) {
      call(fn)
    }
    if (changedAtoms.size) {
      recomputeInvalidatedAtoms(buildingBlocks, store)
    }
  } while (changedAtoms.size || unmountCallbacks.size || mountCallbacks.size)
  if (errors.length) {
    throw new AggregateError(errors)
  }
}

const BUILDING_BLOCK_recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms = (
  buildingBlocks,
  store,
) => {
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  const changedAtoms = buildingBlocks[3]
  const ensureAtomState = buildingBlocks[11]
  const readAtomState = buildingBlocks[14]
  const mountDependencies = buildingBlocks[17]
  if (!changedAtoms.size) {
    return
  }
  // Step 1: traverse the dependency graph to build the topologically sorted atom list
  // We don't bother to check for cycles, which simplifies the algorithm.
  // This is a topological sort via depth-first search, slightly modified from
  // what's described here for simplicity and performance reasons:
  // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
  const sortedReversedAtoms: AnyAtom[] = []
  const sortedReversedStates: AtomState[] = []
  const visiting = new WeakSet<AnyAtom>()
  const visited = new WeakSet<AnyAtom>()
  const stackAtoms: AnyAtom[] = []
  const stackStates: AtomState[] = []
  // Visit the root atoms. This is the only atom in the dependency graph
  // without incoming edges, which is one reason we can simplify the algorithm
  for (const atom of changedAtoms) {
    stackAtoms.push(atom)
    stackStates.push(ensureAtomState(buildingBlocks, store, atom))
  }
  while (stackAtoms.length) {
    const top = stackAtoms.length - 1
    const a = stackAtoms[top]!
    const aState = stackStates[top]!
    if (visited.has(a)) {
      // All dependents have been processed, now process this atom
      stackAtoms.pop()
      stackStates.pop()
      continue
    }
    if (visiting.has(a)) {
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then  will iterate in
      // reverse order later.
      if (invalidatedAtoms.get(a) === aState.n) {
        sortedReversedAtoms.push(a)
        sortedReversedStates.push(aState)
      } else if (
        import.meta.env?.MODE !== 'production' &&
        invalidatedAtoms.has(a)
      ) {
        throw new Error('[Bug] invalidated atom exists')
      }
      // Atom has been visited but not yet processed
      visited.add(a)
      stackAtoms.pop()
      stackStates.pop()
      continue
    }
    visiting.add(a)
    // Push unvisited dependents onto the stack
    for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
      if (!visiting.has(d)) {
        stackAtoms.push(d)
        stackStates.push(ensureAtomState(buildingBlocks, store, d))
      }
    }
  }
  // Step 2: use the topSortedReversed atom list to recompute all affected atoms
  // Track what's changed, so that we can short circuit when possible
  for (let i = sortedReversedAtoms.length - 1; i >= 0; --i) {
    const a = sortedReversedAtoms[i]!
    const aState = sortedReversedStates[i]!
    let hasChangedDeps = false
    for (const dep of aState.d.keys()) {
      if (dep !== a && changedAtoms.has(dep)) {
        hasChangedDeps = true
        break
      }
    }
    if (hasChangedDeps) {
      invalidatedAtoms.set(a, aState.n)
      readAtomState(buildingBlocks, store, a)
      mountDependencies(buildingBlocks, store, a)
    }
    invalidatedAtoms.delete(a)
  }
}

// Dev only
const storeMutationSet = new WeakSet<Store>()

const BUILDING_BLOCK_readAtomState: ReadAtomState = (
  buildingBlocks,
  store,
  atom,
) => {
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  const changedAtoms = buildingBlocks[3]
  const storeHooks = buildingBlocks[6]
  const atomRead = buildingBlocks[7]
  const ensureAtomState = buildingBlocks[11]
  const flushCallbacks = buildingBlocks[12]
  const recomputeInvalidatedAtoms = buildingBlocks[13]
  const readAtomState = buildingBlocks[14]
  const writeAtomState = buildingBlocks[16]
  const mountDependencies = buildingBlocks[17]
  const setAtomStateValueOrPromise = buildingBlocks[20]
  const registerAbortHandler = buildingBlocks[26]
  const storeEpochHolder = buildingBlocks[28]
  const atomState = ensureAtomState(buildingBlocks, store, atom)
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
      return atomState
    }
    // Otherwise, check if the dependencies have changed.
    // If all dependencies haven't changed, we can use the cache.
    let hasChangedDeps = false
    for (const [a, n] of atomState.d) {
      if (readAtomState(buildingBlocks, store, a).n !== n) {
        hasChangedDeps = true
        break
      }
    }
    if (!hasChangedDeps) {
      atomState.m = storeEpochNumber
      return atomState
    }
  }
  // Compute a new state for this atom.
  let isSync = true
  const prevDeps = new Set<AnyAtom>(atomState.d.keys())
  const pruneDependencies = () => {
    for (const a of prevDeps) {
      atomState.d.delete(a)
    }
  }
  const mountDependenciesIfAsync = () => {
    if (mountedMap.has(atom)) {
      // If changedAtoms is already populated, an outer recompute cycle will handle it
      const shouldRecompute = !changedAtoms.size
      mountDependencies(buildingBlocks, store, atom)
      if (shouldRecompute) {
        recomputeInvalidatedAtoms(buildingBlocks, store)
        flushCallbacks(buildingBlocks, store)
      }
    }
  }
  const getter = <V>(a: Atom<V>) => {
    if (a === (atom as AnyAtom)) {
      const aState = ensureAtomState(buildingBlocks, store, a)
      if (!isAtomStateInitialized(aState)) {
        if (hasInitialValue(a)) {
          setAtomStateValueOrPromise(buildingBlocks, store, a, a.init)
        } else {
          // NOTE invalid derived atoms can reach here
          throw new Error('no atom init')
        }
      }
      return returnAtomValue(aState)
    }
    // a !== atom
    const aState = readAtomState(buildingBlocks, store, a)
    try {
      return returnAtomValue(aState)
    } finally {
      prevDeps.delete(a)
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
              return writeAtomState(buildingBlocks, store, atom, args)
            } finally {
              recomputeInvalidatedAtoms(buildingBlocks, store)
              flushCallbacks(buildingBlocks, store)
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
    const valueOrPromise = atomRead(
      buildingBlocks,
      store,
      atom,
      getter,
      options as never,
    )
    if (import.meta.env?.MODE !== 'production' && storeMutationSet.has(store)) {
      console.warn(
        'Detected store mutation during atom read. This is not supported.',
      )
    }
    setAtomStateValueOrPromise(buildingBlocks, store, atom, valueOrPromise)
    if (isPromiseLike(valueOrPromise)) {
      registerAbortHandler(buildingBlocks, store, valueOrPromise, () =>
        controller?.abort(),
      )
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
    return atomState
  } catch (error) {
    delete atomState.v
    atomState.e = error
    ++atomState.n
    atomState.m = storeEpochNumber
    return atomState
  } finally {
    isSync = false
    if (atomState.n !== prevEpochNumber && prevInvalidated) {
      invalidatedAtoms.set(atom, atomState.n)
      changedAtoms.add(atom)
      storeHooks.c?.(atom)
    }
  }
}

const BUILDING_BLOCK_invalidateDependents: InvalidateDependents = (
  buildingBlocks,
  store,
  atom,
) => {
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  const ensureAtomState = buildingBlocks[11]
  const stack: AnyAtom[] = [atom]
  while (stack.length) {
    const a = stack.pop()!
    const aState = ensureAtomState(buildingBlocks, store, a)
    for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
      const dState = ensureAtomState(buildingBlocks, store, d)
      if (invalidatedAtoms.get(d) !== dState.n) {
        invalidatedAtoms.set(d, dState.n)
        stack.push(d)
      }
    }
  }
}

const BUILDING_BLOCK_writeAtomState: WriteAtomState = (
  buildingBlocks,
  store,
  atom,
  args,
) => {
  const changedAtoms = buildingBlocks[3]
  const storeHooks = buildingBlocks[6]
  const atomWrite = buildingBlocks[8]
  const ensureAtomState = buildingBlocks[11]
  const flushCallbacks = buildingBlocks[12]
  const recomputeInvalidatedAtoms = buildingBlocks[13]
  const readAtomState = buildingBlocks[14]
  const invalidateDependents = buildingBlocks[15]
  const writeAtomState = buildingBlocks[16]
  const mountDependencies = buildingBlocks[17]
  const setAtomStateValueOrPromise = buildingBlocks[20]
  const storeEpochHolder = buildingBlocks[28]
  let isSync = true
  const getter: Getter = <V>(a: Atom<V>) =>
    returnAtomValue(readAtomState(buildingBlocks, store, a))
  const setter: Setter = <V, As extends unknown[], R>(
    a: WritableAtom<V, As, R>,
    ...args: As
  ) => {
    const aState = ensureAtomState(buildingBlocks, store, a)
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
        setAtomStateValueOrPromise(buildingBlocks, store, a, v)
        mountDependencies(buildingBlocks, store, a)
        if (prevEpochNumber !== aState.n) {
          ++storeEpochHolder[0]
          changedAtoms.add(a)
          invalidateDependents(buildingBlocks, store, a)
          storeHooks.c?.(a)
        }
        return undefined as R
      } else {
        return writeAtomState(buildingBlocks, store, a, args)
      }
    } finally {
      if (!isSync) {
        recomputeInvalidatedAtoms(buildingBlocks, store)
        flushCallbacks(buildingBlocks, store)
      }
    }
  }
  try {
    return atomWrite(buildingBlocks, store, atom, getter, setter, ...args)
  } finally {
    isSync = false
  }
}

const BUILDING_BLOCK_mountDependencies: MountDependencies = (
  buildingBlocks,
  store,
  atom,
) => {
  const mountedMap = buildingBlocks[1]
  const changedAtoms = buildingBlocks[3]
  const storeHooks = buildingBlocks[6]
  const ensureAtomState = buildingBlocks[11]
  const invalidateDependents = buildingBlocks[15]
  const mountAtom = buildingBlocks[18]
  const unmountAtom = buildingBlocks[19]
  const atomState = ensureAtomState(buildingBlocks, store, atom)
  const mounted = mountedMap.get(atom)
  if (mounted && atomState.d.size > 0) {
    for (const [a, n] of atomState.d) {
      if (!mounted.d.has(a)) {
        const aState = ensureAtomState(buildingBlocks, store, a)
        const aMounted = mountAtom(buildingBlocks, store, a)
        aMounted.t.add(atom)
        mounted.d.add(a)
        if (n !== aState.n) {
          changedAtoms.add(a)
          invalidateDependents(buildingBlocks, store, a)
          storeHooks.c?.(a)
        }
      }
    }
    for (const a of mounted.d) {
      if (!atomState.d.has(a)) {
        mounted.d.delete(a)
        const aMounted = unmountAtom(buildingBlocks, store, a)
        aMounted?.t.delete(atom)
      }
    }
  }
}

const BUILDING_BLOCK_mountAtom: MountAtom = (buildingBlocks, store, atom) => {
  const mountedMap = buildingBlocks[1]
  const mountCallbacks = buildingBlocks[4]
  const storeHooks = buildingBlocks[6]
  const atomOnMount = buildingBlocks[10]
  const ensureAtomState = buildingBlocks[11]
  const flushCallbacks = buildingBlocks[12]
  const recomputeInvalidatedAtoms = buildingBlocks[13]
  const readAtomState = buildingBlocks[14]
  const writeAtomState = buildingBlocks[16]
  const mountAtom = buildingBlocks[18]
  const atomState = ensureAtomState(buildingBlocks, store, atom)
  let mounted = mountedMap.get(atom)
  if (!mounted) {
    // recompute atom state
    readAtomState(buildingBlocks, store, atom)
    // mount dependencies first
    for (const a of atomState.d.keys()) {
      const aMounted = mountAtom(buildingBlocks, store, a)
      aMounted.t.add(atom)
    }
    // mount self
    mounted = {
      l: new Set(),
      d: new Set(atomState.d.keys()),
      t: new Set(),
    }
    mountedMap.set(atom, mounted)
    if (isActuallyWritableAtom(atom) && hasOnMount(atom)) {
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: unknown[]) => {
          try {
            return writeAtomState(buildingBlocks, store, atom, args)
          } finally {
            if (!isSync) {
              recomputeInvalidatedAtoms(buildingBlocks, store)
              flushCallbacks(buildingBlocks, store)
            }
          }
        }
        try {
          const onUnmount = atomOnMount(buildingBlocks, store, atom, setAtom)
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

const BUILDING_BLOCK_unmountAtom: UnmountAtom = (
  buildingBlocks,
  store,
  atom,
) => {
  const mountedMap = buildingBlocks[1]
  const unmountCallbacks = buildingBlocks[5]
  const storeHooks = buildingBlocks[6]
  const ensureAtomState = buildingBlocks[11]
  const unmountAtom = buildingBlocks[19]
  const atomState = ensureAtomState(buildingBlocks, store, atom)
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
    mountedMap.delete(atom)
    // unmount dependencies
    for (const a of atomState.d.keys()) {
      const aMounted = unmountAtom(buildingBlocks, store, a)
      aMounted?.t.delete(atom)
    }
    storeHooks.u?.(atom)
    return undefined
  }
  return mounted
}

const BUILDING_BLOCK_setAtomStateValueOrPromise: SetAtomStateValueOrPromise = (
  buildingBlocks,
  store,
  atom,
  valueOrPromise,
) => {
  const ensureAtomState = buildingBlocks[11]
  const abortPromise = buildingBlocks[27]
  const atomState = ensureAtomState(buildingBlocks, store, atom)
  const hasPrevValue = 'v' in atomState
  const prevValue = atomState.v
  if (isPromiseLike(valueOrPromise)) {
    for (const a of atomState.d.keys()) {
      addPendingPromiseToDependency(
        atom,
        valueOrPromise,
        ensureAtomState(buildingBlocks, store, a),
      )
    }
  }
  atomState.v = valueOrPromise
  delete atomState.e
  if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
    ++atomState.n
    if (isPromiseLike(prevValue)) {
      abortPromise(buildingBlocks, store, prevValue)
    }
  }
}

const BUILDING_BLOCK_storeGet: StoreGet = (buildingBlocks, store, atom) => {
  const readAtomState = buildingBlocks[14]
  return returnAtomValue(readAtomState(buildingBlocks, store, atom))
}

const BUILDING_BLOCK_storeSet: StoreSet = (
  buildingBlocks,
  store,
  atom,
  ...args
) => {
  const changedAtoms = buildingBlocks[3]
  const flushCallbacks = buildingBlocks[12]
  const recomputeInvalidatedAtoms = buildingBlocks[13]
  const writeAtomState = buildingBlocks[16]
  const prevChangedAtomsSize = changedAtoms.size
  try {
    return writeAtomState(buildingBlocks, store, atom, args)
  } finally {
    if (changedAtoms.size !== prevChangedAtomsSize) {
      recomputeInvalidatedAtoms(buildingBlocks, store)
      flushCallbacks(buildingBlocks, store)
    }
  }
}

const BUILDING_BLOCK_storeSub: StoreSub = (
  buildingBlocks,
  store,
  atom,
  listener,
) => {
  const flushCallbacks = buildingBlocks[12]
  const mountAtom = buildingBlocks[18]
  const unmountAtom = buildingBlocks[19]
  const mounted = mountAtom(buildingBlocks, store, atom)
  const listeners = mounted.l
  listeners.add(listener)
  flushCallbacks(buildingBlocks, store)
  return () => {
    listeners.delete(listener)
    unmountAtom(buildingBlocks, store, atom)
    flushCallbacks(buildingBlocks, store)
  }
}

const BUILDING_BLOCK_registerAbortHandler: RegisterAbortHandler = (
  buildingBlocks,
  _store,
  promise,
  abortHandler,
) => {
  const abortHandlersMap = buildingBlocks[25]
  let abortHandlers = abortHandlersMap.get(promise)
  if (!abortHandlers) {
    abortHandlers = new Set()
    abortHandlersMap.set(promise, abortHandlers)
    const cleanup = () => abortHandlersMap.delete(promise)
    promise.then(cleanup, cleanup)
  }
  abortHandlers.add(abortHandler)
}

const BUILDING_BLOCK_abortPromise: AbortPromise = (
  buildingBlocks,
  _store,
  promise,
) => {
  const abortHandlersMap = buildingBlocks[25]
  const abortHandlers = abortHandlersMap.get(promise)
  abortHandlers?.forEach((fn) => fn())
}

const buildingBlockMap = new WeakMap<Store, Readonly<BuildingBlocks>>()

function getBuildingBlocks(store: Store): Readonly<BuildingBlocks> {
  const buildingBlocks = buildingBlockMap.get(store)!
  if (import.meta.env?.MODE !== 'production' && !buildingBlocks) {
    throw new Error(
      'Store must be created by buildStore to read its building blocks',
    )
  }
  const enhanceBuildingBlocks = buildingBlocks[24]
  if (enhanceBuildingBlocks) {
    return enhanceBuildingBlocks(buildingBlocks, store)
  }
  return buildingBlocks
}

function buildStore(...partialBuildingBlocks: Partial<BuildingBlocks>): Store {
  const store: Store = {
    get(atom) {
      return storeGet(buildingBlocks, store, atom)
    },
    set(atom, ...args) {
      return storeSet(buildingBlocks, store, atom, ...args)
    },
    sub(atom, listener) {
      return storeSub(buildingBlocks, store, atom, listener)
    },
  }

  const buildingBlocks = (
    [
      // store state
      new WeakMap(), // atomStateMap
      new WeakMap(), // mountedMap
      new WeakMap(), // invalidatedAtoms
      new Set(), // changedAtoms
      new Set(), // mountCallbacks
      new Set(), // unmountCallbacks
      {}, // storeHooks
      // atom interceptors
      BUILDING_BLOCK_atomRead,
      BUILDING_BLOCK_atomWrite,
      BUILDING_BLOCK_atomOnInit,
      BUILDING_BLOCK_atomOnMount,
      // building-block functions
      BUILDING_BLOCK_ensureAtomState,
      BUILDING_BLOCK_flushCallbacks,
      BUILDING_BLOCK_recomputeInvalidatedAtoms,
      BUILDING_BLOCK_readAtomState,
      BUILDING_BLOCK_invalidateDependents,
      BUILDING_BLOCK_writeAtomState,
      BUILDING_BLOCK_mountDependencies,
      BUILDING_BLOCK_mountAtom,
      BUILDING_BLOCK_unmountAtom,
      BUILDING_BLOCK_setAtomStateValueOrPromise,
      BUILDING_BLOCK_storeGet,
      BUILDING_BLOCK_storeSet,
      BUILDING_BLOCK_storeSub,
      undefined, // enhanceBuildingBlocks
      // abortable promise support
      new WeakMap(), // abortHandlersMap
      BUILDING_BLOCK_registerAbortHandler,
      BUILDING_BLOCK_abortPromise,
      // store epoch
      [0],
    ] satisfies BuildingBlocks
  ).map((fn, i) => partialBuildingBlocks[i] || fn) as BuildingBlocks
  buildingBlockMap.set(store, Object.freeze(buildingBlocks))
  const storeGet = buildingBlocks[21]
  const storeSet = buildingBlocks[22]
  const storeSub = buildingBlocks[23]
  return store
}

export {
  //
  // Export internal functions
  //
  buildStore as INTERNAL_buildStoreRev3,
  getBuildingBlocks as INTERNAL_getBuildingBlocksRev3,
  initializeStoreHooks as INTERNAL_initializeStoreHooksRev3,

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

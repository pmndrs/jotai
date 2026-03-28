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
  atomStateMap: AtomStateMap,
) => AtomState<Value>
type FlushCallbacks = (store: Store) => void
type RecomputeInvalidatedAtoms = (store: Store) => void
type ReadAtomState = <Value>(
  store: Store,
  atom: Atom<Value>,
) => AtomState<Value>
type InvalidateDependents = (store: Store, atoms: readonly AnyAtom[]) => void
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
type EnhanceBuildingBlocks = (
  buildingBlocks: Readonly<BuildingBlocks>,
) => Readonly<BuildingBlocks>
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
  [BUILDING_BLOCKS_KEY]?: Readonly<BuildingBlocks>
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

const EMPTY_SET: ReadonlySet<AnyAtom> = new Set()

function getMountedOrPendingDependents(
  atom: AnyAtom,
  atomState: AtomState,
  mountedMap: MountedMap,
): Iterable<AnyAtom> {
  const mounted = mountedMap.get(atom)
  const mountedDependents = mounted?.t
  const pendingDependents = atomState.p
  if (!mountedDependents || mountedDependents.size === 0) {
    return pendingDependents.size ? pendingDependents : EMPTY_SET
  }
  if (pendingDependents.size === 0) {
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

const BUILDING_BLOCK_atomRead: AtomRead = (_store, atom, ...params) =>
  atom.read(...params)
const BUILDING_BLOCK_atomWrite: AtomWrite = (_store, atom, ...params) =>
  atom.write(...params)
const BUILDING_BLOCK_atomOnInit: AtomOnInit = (store, atom) =>
  atom.INTERNAL_onInit?.(store)
const BUILDING_BLOCK_atomOnMount: AtomOnMount = (_store, atom, setAtom) =>
  atom.onMount?.(setAtom)

const BUILDING_BLOCK_ensureAtomState: EnsureAtomState = (
  store,
  atom,
  atomStateMap,
) => {
  if (import.meta.env?.MODE !== 'production' && !atom) {
    throw new Error('Atom is undefined or null')
  }
  let atomState = atomStateMap.get(atom)
  if (!atomState) {
    const buildingBlocks = getInternalBuildingBlocks(store)
    const storeHooks = buildingBlocks[6]
    const atomOnInit = buildingBlocks[9]
    atomState = { d: new Map(), p: new Set(), n: 0 }
    atomStateMap.set(atom, atomState)
    storeHooks.i?.(atom)
    atomOnInit(store, atom)
  }
  return atomState as never
}

const BUILDING_BLOCK_flushCallbacks: FlushCallbacks = (store) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const changedAtoms = buildingBlocks[3]
  const mountCallbacks = buildingBlocks[4]
  const unmountCallbacks = buildingBlocks[5]
  const storeHooks = buildingBlocks[6]
  if (
    changedAtoms.size === 0 &&
    mountCallbacks.size === 0 &&
    unmountCallbacks.size === 0 &&
    !storeHooks.f
  ) {
    return
  }
  let mountedMap: MountedMap
  let recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms
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
    if (changedAtoms.size) {
      mountedMap ||= buildingBlocks[1]
      changedAtoms.forEach((atom) => mountedMap.get(atom)?.l.forEach(add))
      changedAtoms.clear()
    }
    if (unmountCallbacks.size) {
      unmountCallbacks.forEach(add)
      unmountCallbacks.clear()
    }
    if (mountCallbacks.size) {
      mountCallbacks.forEach(add)
      mountCallbacks.clear()
    }
    callbacks.forEach(call)
    if (changedAtoms.size) {
      recomputeInvalidatedAtoms ||= buildingBlocks[13]
      recomputeInvalidatedAtoms(store)
    }
  } while (changedAtoms.size || unmountCallbacks.size || mountCallbacks.size)
  if (errors.length) {
    throw new AggregateError(errors)
  }
}

const BUILDING_BLOCK_recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms = (
  store,
) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const changedAtoms = buildingBlocks[3]
  if (changedAtoms.size === 0) {
    return
  }
  const atomStateMap = buildingBlocks[0]
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  let readAtomState: ReadAtomState
  let mountDependencies: MountDependencies
  const ensureAtomState = buildingBlocks[11]
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
  const stack: [AnyAtom, AtomState][] = []
  for (const atom of changedAtoms) {
    stack.push([atom, ensureAtomState(store, atom, atomStateMap)])
  }
  while (stack.length) {
    const [a, aState] = stack[stack.length - 1]!
    if (visited.has(a)) {
      // All dependents have been processed, now process this atom
      stack.pop()
      continue
    }
    if (visiting.has(a)) {
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then  will iterate in
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
        stack.push([d, ensureAtomState(store, d, atomStateMap)])
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
      readAtomState ||= buildingBlocks[14]
      readAtomState(store, a)
      mountDependencies ||= buildingBlocks[17]
      mountDependencies(store, a)
    }
    invalidatedAtoms.delete(a)
  }
}

// Dev only
const storeMutationSet = new WeakSet<Store>()

const BUILDING_BLOCK_readAtomState: ReadAtomState = (store, atom) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const atomStateMap = buildingBlocks[0]
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  const changedAtoms = buildingBlocks[3]
  const ensureAtomState = buildingBlocks[11]
  const readAtomState = buildingBlocks[14]
  const setAtomStateValueOrPromise = buildingBlocks[20]
  const atomState = ensureAtomState(store, atom, atomStateMap)
  const storeEpochNumber = buildingBlocks[28][0]
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
      if (readAtomState(store, a).n !== n) {
        hasChangedDeps = true
        break
      }
    }
    if (!hasChangedDeps) {
      atomState.m = storeEpochNumber
      return atomState
    }
  }
  let storeHooks: StoreHooks
  const atomRead = buildingBlocks[7]
  let writeAtomState: WriteAtomState
  let flushCallbacks: FlushCallbacks
  let mountDependencies: MountDependencies
  let recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms
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
      mountDependencies ||= buildingBlocks[17]
      mountDependencies(store, atom)
      if (shouldRecompute) {
        flushCallbacks ||= buildingBlocks[12]
        recomputeInvalidatedAtoms ||= buildingBlocks[13]
        recomputeInvalidatedAtoms(store)
        flushCallbacks(store)
      }
    }
  }
  const getter = <V>(a: Atom<V>) => {
    if (a === (atom as AnyAtom)) {
      const aState = ensureAtomState(store, a, atomStateMap)
      if (!isAtomStateInitialized(aState)) {
        if (hasInitialValue(a)) {
          setAtomStateValueOrPromise(store, a, a.init)
        } else {
          // NOTE invalid derived atoms can reach here
          throw new Error('no atom init')
        }
      }
      return returnAtomValue(aState)
    }
    // a !== atom
    const aState = readAtomState(store, a)
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
              writeAtomState ||= buildingBlocks[16]
              return writeAtomState(store, atom, ...args)
            } finally {
              flushCallbacks ||= buildingBlocks[12]
              recomputeInvalidatedAtoms ||= buildingBlocks[13]
              recomputeInvalidatedAtoms(store)
              flushCallbacks(store)
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
    const valueOrPromise = atomRead(store, atom, getter, options as never)
    if (import.meta.env?.MODE !== 'production' && storeMutationSet.has(store)) {
      console.warn(
        'Detected store mutation during atom read. This is not supported.',
      )
    }
    setAtomStateValueOrPromise(store, atom, valueOrPromise)
    if (isPromiseLike(valueOrPromise)) {
      const registerAbortHandler = buildingBlocks[26]
      registerAbortHandler(store, valueOrPromise, () => controller?.abort())
      const settle = () => {
        pruneDependencies()
        mountDependenciesIfAsync()
      }
      valueOrPromise.then(settle, settle)
    } else {
      pruneDependencies()
    }
    storeHooks ||= buildingBlocks[6]
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
      storeHooks ||= buildingBlocks[6]
      storeHooks.c?.(atom)
    }
  }
}

const BUILDING_BLOCK_invalidateDependents: InvalidateDependents = (
  store,
  atoms,
) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const atomStateMap = buildingBlocks[0]
  const mountedMap = buildingBlocks[1]
  const invalidatedAtoms = buildingBlocks[2]
  const ensureAtomState = buildingBlocks[11]
  const stack: [AnyAtom, AtomState][] = []
  for (const atom of atoms) {
    stack.push([atom, ensureAtomState(store, atom, atomStateMap)])
  }
  while (stack.length) {
    const [a, aState] = stack.pop()!
    for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
      const dState = ensureAtomState(store, d, atomStateMap)
      if (invalidatedAtoms.get(d) !== dState.n) {
        invalidatedAtoms.set(d, dState.n)
        stack.push([d, dState])
      }
    }
  }
}

const BUILDING_BLOCK_writeAtomState: WriteAtomState = (
  store,
  atom,
  ...args
) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  let atomStateMap: AtomStateMap
  let changedAtoms: ChangedAtoms
  let storeHooks: StoreHooks
  const atomWrite = buildingBlocks[8]
  let ensureAtomState: EnsureAtomState
  let flushCallbacks: FlushCallbacks
  let recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms
  const readAtomState = buildingBlocks[14]
  let invalidateDependents: InvalidateDependents
  let writeAtomState: WriteAtomState
  let mountDependencies: MountDependencies
  const setAtomStateValueOrPromise = buildingBlocks[20]
  let storeEpochHolder: StoreEpochHolder
  let isSync = true
  const getter: Getter = <V>(a: Atom<V>) =>
    returnAtomValue(readAtomState(store, a))
  const setter: Setter = <V, As extends unknown[], R>(
    a: WritableAtom<V, As, R>,
    ...args: As
  ) => {
    atomStateMap ||= buildingBlocks[0]
    ensureAtomState ||= buildingBlocks[11]
    const aState = ensureAtomState(store, a, atomStateMap)
    try {
      if (a === (atom as AnyAtom)) {
        changedAtoms ||= buildingBlocks[3]
        invalidateDependents ||= buildingBlocks[15]
        mountDependencies ||= buildingBlocks[17]
        storeEpochHolder ||= buildingBlocks[28]
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        if (import.meta.env?.MODE !== 'production') {
          storeMutationSet.add(store)
        }
        const prevEpochNumber = aState.n
        const v = args[0] as V
        setAtomStateValueOrPromise(store, a, v)
        mountDependencies(store, a)
        if (prevEpochNumber !== aState.n) {
          storeHooks ||= buildingBlocks[6]
          ++storeEpochHolder[0]
          changedAtoms.add(a)
          invalidateDependents(store, [a])
          storeHooks.c?.(a)
        }
        return undefined as R
      } else {
        writeAtomState ||= buildingBlocks[16]
        return writeAtomState(store, a, ...args)
      }
    } finally {
      if (!isSync) {
        recomputeInvalidatedAtoms ||= buildingBlocks[13]
        recomputeInvalidatedAtoms(store)
        flushCallbacks ||= buildingBlocks[12]
        flushCallbacks(store)
      }
    }
  }
  try {
    return atomWrite(store, atom, getter, setter, ...args)
  } finally {
    isSync = false
  }
}

const BUILDING_BLOCK_mountDependencies: MountDependencies = (store, atom) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const atomStateMap = buildingBlocks[0]
  const mountedMap = buildingBlocks[1]
  const ensureAtomState = buildingBlocks[11]
  const atomState = ensureAtomState(store, atom, atomStateMap)
  const mounted = mountedMap.get(atom)
  if (mounted) {
    const staleDeps: AnyAtom[] = []
    for (const [a, n] of atomState.d) {
      if (!mounted.d.has(a)) {
        const aState = ensureAtomState(store, a, atomStateMap)
        const mountAtom = buildingBlocks[18]
        const aMounted = mountAtom(store, a)
        aMounted.t.add(atom)
        mounted.d.add(a)
        if (n !== aState.n) {
          staleDeps.push(a)
        }
      }
    }
    if (staleDeps.length) {
      const invalidateDependents = buildingBlocks[15]
      invalidateDependents(store, staleDeps)
      const changedAtoms = buildingBlocks[3]
      const storeHooks = buildingBlocks[6]
      for (const a of staleDeps) {
        changedAtoms.add(a)
        storeHooks.c?.(a)
      }
    }
    for (const a of mounted.d) {
      if (!atomState.d.has(a)) {
        mounted.d.delete(a)
        const unmountAtom = buildingBlocks[19]
        const aMounted = unmountAtom(store, a)
        aMounted?.t.delete(atom)
      }
    }
  }
}

const BUILDING_BLOCK_mountAtom: MountAtom = (store, atom) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const mountedMap = buildingBlocks[1]
  let mountCallbacks: Callbacks
  let storeHooks: StoreHooks
  let mounted = mountedMap.get(atom)
  if (mounted) {
    return mounted
  }
  const readAtomState = buildingBlocks[14]
  type MountFrame = [atom: AnyAtom, atomState: AtomState | null, entered: number]
  const stack: MountFrame[] = [[atom, null, 0]]
  while (stack.length) {
    const frame = stack[stack.length - 1]!
    const [atom] = frame
    const existingMounted = mountedMap.get(atom)
    if (existingMounted) {
      stack.pop()
      continue
    }
    if (!frame[2]) {
      frame[2] = 1
      // Recompute atom state before reading dependencies.
      const atomState = readAtomState(store, atom)
      frame[1] = atomState
      for (const dep of atomState.d.keys()) {
        if (!mountedMap.has(dep)) {
          stack.push([dep, null, 0])
        }
      }
      continue
    }
    const atomState = frame[1]!
    const nextMounted: Mounted = {
      l: new Set(),
      d: new Set(atomState.d.keys()),
      t: new Set(),
    }
    mountedMap.set(atom, nextMounted)
    for (const dep of atomState.d.keys()) {
      mountedMap.get(dep)?.t.add(atom)
    }
    if (isActuallyWritableAtom(atom)) {
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: unknown[]) => {
          try {
            const writeAtomState = buildingBlocks[16]
            return writeAtomState(store, atom as AnyWritableAtom, ...args)
          } finally {
            if (!isSync) {
              const recomputeInvalidatedAtoms = buildingBlocks[13]
              recomputeInvalidatedAtoms(store)
              const flushCallbacks = buildingBlocks[12]
              flushCallbacks(store)
            }
          }
        }
        try {
          const atomOnMount = buildingBlocks[10]
          const onUnmount = atomOnMount(
            store,
            atom as AnyWritableAtom,
            setAtom,
          )
          if (onUnmount) {
            nextMounted.u = () => {
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
      mountCallbacks ||= buildingBlocks[4]
      mountCallbacks.add(processOnMount)
    }
    storeHooks ||= buildingBlocks[6]
    storeHooks.m?.(atom)
    stack.pop()
  }
  return mountedMap.get(atom)!
}

const BUILDING_BLOCK_unmountAtom: UnmountAtom = (store, atom) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const atomStateMap = buildingBlocks[0]
  const mountedMap = buildingBlocks[1]
  const unmountCallbacks = buildingBlocks[5]
  let storeHooks: StoreHooks
  const ensureAtomState = buildingBlocks[11]
  type UnmountFrame = [
    atom: AnyAtom,
    phase: 0 | 1,
    deps: AnyAtom[],
  ]
  const stack: UnmountFrame[] = [[atom, 0, []]]
  while (stack.length) {
    const frame = stack[stack.length - 1]!
    const [atom] = frame
    if (frame[1] === 0) {
      const mounted = mountedMap.get(atom)
      if (!mounted || mounted.l.size) {
        stack.pop()
        continue
      }
      let isDependent = false
      for (const a of mounted.t) {
        if (mountedMap.get(a)?.d.has(atom)) {
          isDependent = true
          break
        }
      }
      if (isDependent) {
        stack.pop()
        continue
      }
      if (mounted.u) {
        unmountCallbacks.add(mounted.u)
      }
      mountedMap.delete(atom)
      const atomState = ensureAtomState(store, atom, atomStateMap)
      frame[2] = [...atomState.d.keys()].reverse()
      frame[1] = 1
      continue
    }
    if (frame[1] === 1) {
      const dep = frame[2].pop()
      if (dep) {
        mountedMap.get(dep)?.t.delete(atom)
        stack.push([dep, 0, []])
        continue
      }
      storeHooks ||= buildingBlocks[6]
      storeHooks.u?.(atom)
      stack.pop()
    }
  }
  return mountedMap.get(atom)
}

const BUILDING_BLOCK_setAtomStateValueOrPromise: SetAtomStateValueOrPromise = (
  store,
  atom,
  valueOrPromise,
) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const atomStateMap = buildingBlocks[0]
  const ensureAtomState = buildingBlocks[11]
  const atomState = ensureAtomState(store, atom, atomStateMap)
  const hasPrevValue = 'v' in atomState
  const prevValue = atomState.v
  if (isPromiseLike(valueOrPromise)) {
    for (const a of atomState.d.keys()) {
      addPendingPromiseToDependency(
        atom,
        valueOrPromise,
        ensureAtomState(store, a, atomStateMap),
      )
    }
  }
  atomState.v = valueOrPromise
  delete atomState.e
  if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
    ++atomState.n
    if (isPromiseLike(prevValue)) {
      const abortPromise = buildingBlocks[27]
      abortPromise(store, prevValue)
    }
  }
}

const BUILDING_BLOCK_storeGet: StoreGet = (store, atom) => {
  const readAtomState = getInternalBuildingBlocks(store)[14]
  return returnAtomValue(readAtomState(store, atom)) as any
}

const BUILDING_BLOCK_storeSet: StoreSet = (store, atom, ...args) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const changedAtoms = buildingBlocks[3]
  const writeAtomState = buildingBlocks[16]
  const prevChangedAtomsSize = changedAtoms.size
  try {
    return writeAtomState(store, atom, ...args) as any
  } finally {
    if (changedAtoms.size !== prevChangedAtomsSize) {
      const recomputeInvalidatedAtoms = buildingBlocks[13]
      const flushCallbacks = buildingBlocks[12]
      recomputeInvalidatedAtoms(store)
      flushCallbacks(store)
    }
  }
}

const BUILDING_BLOCK_storeSub: StoreSub = (store, atom, listener) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const mountAtom = buildingBlocks[18]
  const mounted = mountAtom(store, atom)
  const listeners = mounted.l
  listeners.add(listener)
  const flushCallbacks = buildingBlocks[12]
  flushCallbacks(store)
  return () => {
    listeners.delete(listener)
    const unmountAtom = buildingBlocks[19]
    unmountAtom(store, atom)
    const flushCallbacks = buildingBlocks[12]
    flushCallbacks(store)
  }
}

const BUILDING_BLOCK_registerAbortHandler: RegisterAbortHandler = (
  store,
  promise,
  abortHandler,
) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
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

const BUILDING_BLOCK_abortPromise: AbortPromise = (store, promise) => {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const abortHandlersMap = buildingBlocks[25]
  const abortHandlers = abortHandlersMap.get(promise)
  abortHandlers?.forEach((fn) => fn())
}

const BUILDING_BLOCKS_KEY: unique symbol = Symbol('jotai.internal.buildingBlocks')

const getInternalBuildingBlocks = (store: Store): Readonly<BuildingBlocks> => {
  const buildingBlocks = store[BUILDING_BLOCKS_KEY]
  if (import.meta.env?.MODE !== 'production' && !buildingBlocks) {
    throw new Error(
      'Store must be created by buildStore to read its building blocks',
    )
  }
  return buildingBlocks!
}

function getBuildingBlocks(store: Store): Readonly<BuildingBlocks> {
  const buildingBlocks = getInternalBuildingBlocks(store)
  const enhanceBuildingBlocks = buildingBlocks[24]
  if (enhanceBuildingBlocks) {
    return enhanceBuildingBlocks(buildingBlocks)
  }
  return buildingBlocks
}

function buildStore(...buildArgs: Partial<BuildingBlocks>): Store {
  const store = {
    get(atom) {
      const storeGet = getInternalBuildingBlocks(store)[21]
      return storeGet(store, atom)
    },
    set(atom, ...args) {
      const storeSet = getInternalBuildingBlocks(store)[22]
      return storeSet(store, atom, ...args)
    },
    sub(atom, listener) {
      const storeSub = getInternalBuildingBlocks(store)[23]
      return storeSub(store, atom, listener)
    },
  } as Store

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
      undefined,
      // abortable promise support
      new WeakMap(), // abortHandlersMap
      BUILDING_BLOCK_registerAbortHandler,
      BUILDING_BLOCK_abortPromise,
      // store epoch
      [0],
    ] satisfies BuildingBlocks
  ).map((fn, i) => buildArgs[i] || fn) as BuildingBlocks
  Object.defineProperty(store, BUILDING_BLOCKS_KEY, {
    value: Object.freeze(buildingBlocks),
  })
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

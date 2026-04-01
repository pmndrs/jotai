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
  ...buildingBlocks: BuildingBlocks
) => AtomState<Value>
type FlushCallbacks = (store: Store, ...buildingBlocks: BuildingBlocks) => void
type RecomputeInvalidatedAtoms = (
  store: Store,
  ...buildingBlocks: BuildingBlocks
) => void
type ReadAtomState = <Value>(
  store: Store,
  atom: Atom<Value>,
  ...buildingBlocks: BuildingBlocks
) => AtomState<Value>
type InvalidateDependents = (
  store: Store,
  atom: AnyAtom,
  ...buildingBlocks: BuildingBlocks
) => void
type WriteAtomState = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  args: Args,
  ...buildingBlocks: BuildingBlocks
) => Result
type MountDependencies = (
  store: Store,
  atom: AnyAtom,
  ...buildingBlocks: BuildingBlocks
) => void
type MountAtom = <Value>(
  store: Store,
  atom: Atom<Value>,
  ...buildingBlocks: BuildingBlocks
) => Mounted
type UnmountAtom = <Value>(
  store: Store,
  atom: Atom<Value>,
  ...buildingBlocks: BuildingBlocks
) => Mounted | undefined
type SetAtomStateValueOrPromise = <Value>(
  store: Store,
  atom: Atom<Value>,
  valueOrPromise: Value,
  ...buildingBlocks: BuildingBlocks
) => void
type StoreGet = <Value>(
  store: Store,
  atom: Atom<Value>,
  ...buildingBlocks: BuildingBlocks
) => Value
type StoreSet = <Value, Args extends unknown[], Result>(
  store: Store,
  atom: WritableAtom<Value, Args, Result>,
  args: Args,
  ...buildingBlocks: BuildingBlocks
) => Result
type StoreSub = (
  store: Store,
  atom: AnyAtom,
  listener: () => void,
  ...buildingBlocks: BuildingBlocks
) => () => void
type EnhanceBuildingBlocks = (
  buildingBlocks: Readonly<BuildingBlocks>,
) => Readonly<BuildingBlocks>
type AbortHandlersMap = WeakMapLike<PromiseLike<unknown>, Set<() => void>>
type RegisterAbortHandler = <T>(
  store: Store,
  promise: PromiseLike<T>,
  abortHandler: () => void,
  ...buildingBlocks: BuildingBlocks
) => void
type AbortPromise = <T>(
  promise: PromiseLike<T>,
  ...buildingBlocks: BuildingBlocks
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
  ...buildingBlocks
) => {
  const BB_atomStateMap = buildingBlocks[0]
  const BB_storeHooks = buildingBlocks[6]
  const BB_atomOnInit = buildingBlocks[9]
  if (import.meta.env?.MODE !== 'production' && !atom) {
    throw new Error('Atom is undefined or null')
  }
  let atomState = BB_atomStateMap.get(atom)
  if (!atomState) {
    atomState = { d: new Map(), p: new Set(), n: 0 }
    BB_atomStateMap.set(atom, atomState)
    BB_storeHooks.i?.(atom)
    BB_atomOnInit?.(store, atom)
  }
  return atomState as never
}

const BUILDING_BLOCK_flushCallbacks: FlushCallbacks = (
  store,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_changedAtoms = buildingBlocks[3]
  const BB_mountCallbacks = buildingBlocks[4]
  const BB_unmountCallbacks = buildingBlocks[5]
  const BB_storeHooks = buildingBlocks[6]
  const BB_recomputeInvalidatedAtoms = buildingBlocks[13]
  const errors: unknown[] = []
  const call = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      errors.push(e)
    }
  }
  do {
    if (BB_storeHooks.f) {
      call(BB_storeHooks.f)
    }
    const callbacks = new Set<() => void>()
    const add = callbacks.add.bind(callbacks)
    BB_changedAtoms.forEach((atom) => BB_mountedMap.get(atom)?.l.forEach(add))
    BB_changedAtoms.clear()
    BB_unmountCallbacks.forEach(add)
    BB_unmountCallbacks.clear()
    BB_mountCallbacks.forEach(add)
    BB_mountCallbacks.clear()
    callbacks.forEach(call)
    if (BB_changedAtoms.size) {
      BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
    }
  } while (
    BB_changedAtoms.size ||
    BB_unmountCallbacks.size ||
    BB_mountCallbacks.size
  )
  if (errors.length) {
    throw new AggregateError(errors)
  }
}

const BUILDING_BLOCK_recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms = (
  store,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_invalidatedAtoms = buildingBlocks[2]
  const BB_changedAtoms = buildingBlocks[3]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_readAtomState = buildingBlocks[14]
  const BB_mountDependencies = buildingBlocks[17]
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
  const stack: AnyAtom[] = Array.from(BB_changedAtoms)
  while (stack.length) {
    const a = stack[stack.length - 1]!
    const aState = BB_ensureAtomState(store, a, ...buildingBlocks)
    if (visited.has(a)) {
      // All dependents have been processed, now process this atom
      stack.pop()
      continue
    }
    if (visiting.has(a)) {
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then will iterate in
      // reverse order later.
      if (BB_invalidatedAtoms.get(a) === aState.n) {
        topSortedReversed.push([a, aState])
      } else if (
        import.meta.env?.MODE !== 'production' &&
        BB_invalidatedAtoms.has(a)
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
    for (const d of getMountedOrPendingDependents(a, aState, BB_mountedMap)) {
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
      if (dep !== a && BB_changedAtoms.has(dep)) {
        hasChangedDeps = true
        break
      }
    }
    if (hasChangedDeps) {
      BB_invalidatedAtoms.set(a, aState.n)
      BB_readAtomState(store, a, ...buildingBlocks)
      BB_mountDependencies(store, a, ...buildingBlocks)
    }
    BB_invalidatedAtoms.delete(a)
  }
}

// Dev only
const storeMutationSet = new WeakSet<Store>()

const BUILDING_BLOCK_readAtomState: ReadAtomState = (
  store,
  atom,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_invalidatedAtoms = buildingBlocks[2]
  const BB_changedAtoms = buildingBlocks[3]
  const BB_storeHooks = buildingBlocks[6]
  const BB_atomRead = buildingBlocks[7]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_flushCallbacks = buildingBlocks[12]
  const BB_recomputeInvalidatedAtoms = buildingBlocks[13]
  const BB_readAtomState = buildingBlocks[14]
  const BB_writeAtomState = buildingBlocks[16]
  const BB_mountDependencies = buildingBlocks[17]
  const BB_setAtomStateValueOrPromise = buildingBlocks[20]
  const BB_registerAbortHandler = buildingBlocks[26]
  const BB_storeEpochHolder = buildingBlocks[28]
  const atomState = BB_ensureAtomState(store, atom, ...buildingBlocks)
  const storeEpochNumber = BB_storeEpochHolder[0]
  // See if we can skip recomputing this atom.
  if (isAtomStateInitialized(atomState)) {
    if (
      // If the atom is mounted, we can use cached atom state,
      // because it should have been updated by dependencies.
      // We can't use the cache if the atom is invalidated.
      (BB_mountedMap.has(atom) &&
        BB_invalidatedAtoms.get(atom) !== atomState.n) ||
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
      if (BB_readAtomState(store, a, ...buildingBlocks).n !== n) {
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
  const nextDeps = new Map<AnyAtom, EpochNumber>()
  const pruneDependencies = () => {
    for (const a of prevDeps) {
      if (!nextDeps.has(a)) {
        atomState.d.delete(a)
      }
    }
  }
  const mountDependenciesIfAsync = () => {
    if (BB_mountedMap.has(atom)) {
      // If changedAtoms is already populated, an outer recompute cycle will handle it
      const shouldRecompute = !BB_changedAtoms.size
      BB_mountDependencies(store, atom, ...buildingBlocks)
      if (shouldRecompute) {
        BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
        BB_flushCallbacks(store, ...buildingBlocks)
      }
    }
  }
  const getter = <V>(a: Atom<V>) => {
    if (a === (atom as AnyAtom)) {
      const aState = BB_ensureAtomState(store, a, ...buildingBlocks)
      if (!isAtomStateInitialized(aState)) {
        if (hasInitialValue(a)) {
          BB_setAtomStateValueOrPromise(store, a, a.init, ...buildingBlocks)
        } else {
          // NOTE invalid derived atoms can reach here
          throw new Error('no atom init')
        }
      }
      return returnAtomValue(aState)
    }
    // a !== atom
    const aState = BB_readAtomState(store, a, ...buildingBlocks)
    try {
      return returnAtomValue(aState)
    } finally {
      nextDeps.set(a, aState.n)
      atomState.d.set(a, aState.n)
      if (isPromiseLike(atomState.v)) {
        addPendingPromiseToDependency(atom, atomState.v, aState)
      }
      if (BB_mountedMap.has(atom)) {
        BB_mountedMap.get(a)?.t.add(atom)
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
              return BB_writeAtomState(store, atom, args, ...buildingBlocks)
            } finally {
              BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
              BB_flushCallbacks(store, ...buildingBlocks)
            }
          }
        }
      }
      return setSelf
    },
  }
  const prevEpochNumber = atomState.n
  const prevInvalidated = BB_invalidatedAtoms.get(atom) === prevEpochNumber
  try {
    if (import.meta.env?.MODE !== 'production') {
      storeMutationSet.delete(store)
    }
    const valueOrPromise = BB_atomRead(store, atom, getter, options as never)
    if (import.meta.env?.MODE !== 'production' && storeMutationSet.has(store)) {
      console.warn(
        'Detected store mutation during atom read. This is not supported.',
      )
    }
    BB_setAtomStateValueOrPromise(
      store,
      atom,
      valueOrPromise,
      ...buildingBlocks,
    )
    if (isPromiseLike(valueOrPromise)) {
      BB_registerAbortHandler(
        store,
        valueOrPromise,
        () => controller?.abort(),
        ...buildingBlocks,
      )
      const settle = () => {
        pruneDependencies()
        mountDependenciesIfAsync()
      }
      valueOrPromise.then(settle, settle)
    } else {
      pruneDependencies()
    }
    BB_storeHooks.r?.(atom)
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
      BB_invalidatedAtoms.set(atom, atomState.n)
      BB_changedAtoms.add(atom)
      BB_storeHooks.c?.(atom)
    }
  }
}

const BUILDING_BLOCK_invalidateDependents: InvalidateDependents = (
  store,
  atom,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_invalidatedAtoms = buildingBlocks[2]
  const BB_ensureAtomState = buildingBlocks[11]
  const stack: AnyAtom[] = [atom]
  while (stack.length) {
    const a = stack.pop()!
    const aState = BB_ensureAtomState(store, a, ...buildingBlocks)
    for (const d of getMountedOrPendingDependents(a, aState, BB_mountedMap)) {
      const dState = BB_ensureAtomState(store, d, ...buildingBlocks)
      if (BB_invalidatedAtoms.get(d) !== dState.n) {
        BB_invalidatedAtoms.set(d, dState.n)
        stack.push(d)
      }
    }
  }
}

const BUILDING_BLOCK_writeAtomState: WriteAtomState = (
  store,
  atom,
  args,
  ...buildingBlocks
) => {
  const BB_changedAtoms = buildingBlocks[3]
  const BB_storeHooks = buildingBlocks[6]
  const BB_atomWrite = buildingBlocks[8]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_flushCallbacks = buildingBlocks[12]
  const BB_recomputeInvalidatedAtoms = buildingBlocks[13]
  const BB_readAtomState = buildingBlocks[14]
  const BB_invalidateDependents = buildingBlocks[15]
  const BB_writeAtomState = buildingBlocks[16]
  const BB_mountDependencies = buildingBlocks[17]
  const BB_setAtomStateValueOrPromise = buildingBlocks[20]
  const BB_storeEpochHolder = buildingBlocks[28]
  let isSync = true
  const getter: Getter = <V>(a: Atom<V>) =>
    returnAtomValue(BB_readAtomState(store, a, ...buildingBlocks))
  const setter: Setter = <V, As extends unknown[], R>(
    a: WritableAtom<V, As, R>,
    ...args: As
  ) => {
    const aState = BB_ensureAtomState(store, a, ...buildingBlocks)
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
        BB_setAtomStateValueOrPromise(store, a, v, ...buildingBlocks)
        BB_mountDependencies(store, a, ...buildingBlocks)
        if (prevEpochNumber !== aState.n) {
          ++BB_storeEpochHolder[0]
          BB_changedAtoms.add(a)
          BB_invalidateDependents(store, a, ...buildingBlocks)
          BB_storeHooks.c?.(a)
        }
        return undefined as R
      } else {
        return BB_writeAtomState(store, a, args, ...buildingBlocks)
      }
    } finally {
      if (!isSync) {
        BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
        BB_flushCallbacks(store, ...buildingBlocks)
      }
    }
  }
  try {
    return BB_atomWrite(store, atom, getter, setter, ...args)
  } finally {
    isSync = false
  }
}

const BUILDING_BLOCK_mountDependencies: MountDependencies = (
  store,
  atom,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_changedAtoms = buildingBlocks[3]
  const BB_storeHooks = buildingBlocks[6]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_invalidateDependents = buildingBlocks[15]
  const BB_mountAtom = buildingBlocks[18]
  const BB_unmountAtom = buildingBlocks[19]
  const atomState = BB_ensureAtomState(store, atom, ...buildingBlocks)
  const mounted = BB_mountedMap.get(atom)
  if (mounted) {
    for (const [a, n] of atomState.d) {
      if (!mounted.d.has(a)) {
        const aState = BB_ensureAtomState(store, a, ...buildingBlocks)
        const aMounted = BB_mountAtom(store, a, ...buildingBlocks)
        aMounted.t.add(atom)
        mounted.d.add(a)
        if (n !== aState.n) {
          BB_changedAtoms.add(a)
          BB_invalidateDependents(store, a, ...buildingBlocks)
          BB_storeHooks.c?.(a)
        }
      }
    }
    for (const a of mounted.d) {
      if (!atomState.d.has(a)) {
        mounted.d.delete(a)
        const aMounted = BB_unmountAtom(store, a, ...buildingBlocks)
        aMounted?.t.delete(atom)
      }
    }
  }
}

const BUILDING_BLOCK_mountAtom: MountAtom = (
  store,
  atom,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_mountCallbacks = buildingBlocks[4]
  const BB_storeHooks = buildingBlocks[6]
  const BB_atomOnMount = buildingBlocks[10]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_flushCallbacks = buildingBlocks[12]
  const BB_recomputeInvalidatedAtoms = buildingBlocks[13]
  const BB_readAtomState = buildingBlocks[14]
  const BB_writeAtomState = buildingBlocks[16]
  const BB_mountAtom = buildingBlocks[18]
  const atomState = BB_ensureAtomState(store, atom, ...buildingBlocks)
  let mounted = BB_mountedMap.get(atom)
  if (!mounted) {
    // recompute atom state
    BB_readAtomState(store, atom, ...buildingBlocks)
    // mount dependencies first
    for (const a of atomState.d.keys()) {
      const aMounted = BB_mountAtom(store, a, ...buildingBlocks)
      aMounted.t.add(atom)
    }
    // mount self
    mounted = {
      l: new Set(),
      d: new Set(atomState.d.keys()),
      t: new Set(),
    }
    BB_mountedMap.set(atom, mounted)
    if (isActuallyWritableAtom(atom)) {
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: unknown[]) => {
          try {
            return BB_writeAtomState(store, atom, args, ...buildingBlocks)
          } finally {
            if (!isSync) {
              BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
              BB_flushCallbacks(store, ...buildingBlocks)
            }
          }
        }
        try {
          const onUnmount = BB_atomOnMount(store, atom, setAtom)
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
      BB_mountCallbacks.add(processOnMount)
    }
    BB_storeHooks.m?.(atom)
  }
  return mounted
}

const BUILDING_BLOCK_unmountAtom: UnmountAtom = (
  store,
  atom,
  ...buildingBlocks
) => {
  const BB_mountedMap = buildingBlocks[1]
  const BB_unmountCallbacks = buildingBlocks[5]
  const BB_storeHooks = buildingBlocks[6]
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_unmountAtom = buildingBlocks[19]
  const atomState = BB_ensureAtomState(store, atom, ...buildingBlocks)
  let mounted = BB_mountedMap.get(atom)
  if (!mounted || mounted.l.size) {
    return mounted
  }
  let isDependent = false
  for (const a of mounted.t) {
    if (BB_mountedMap.get(a)?.d.has(atom)) {
      isDependent = true
      break
    }
  }
  if (!isDependent) {
    // unmount self
    if (mounted.u) {
      BB_unmountCallbacks.add(mounted.u)
    }
    mounted = undefined
    BB_mountedMap.delete(atom)
    // unmount dependencies
    for (const a of atomState.d.keys()) {
      const aMounted = BB_unmountAtom(store, a, ...buildingBlocks)
      aMounted?.t.delete(atom)
    }
    BB_storeHooks.u?.(atom)
    return undefined
  }
  return mounted
}

const BUILDING_BLOCK_setAtomStateValueOrPromise: SetAtomStateValueOrPromise = (
  store,
  atom,
  valueOrPromise,
  ...buildingBlocks
) => {
  const BB_ensureAtomState = buildingBlocks[11]
  const BB_abortPromise = buildingBlocks[27]
  const atomState = BB_ensureAtomState(store, atom, ...buildingBlocks)
  const hasPrevValue = 'v' in atomState
  const prevValue = atomState.v
  if (isPromiseLike(valueOrPromise)) {
    for (const a of atomState.d.keys()) {
      addPendingPromiseToDependency(
        atom,
        valueOrPromise,
        BB_ensureAtomState(store, a, ...buildingBlocks),
      )
    }
  }
  atomState.v = valueOrPromise
  delete atomState.e
  if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
    ++atomState.n
    if (isPromiseLike(prevValue)) {
      BB_abortPromise(prevValue, ...buildingBlocks)
    }
  }
}

const BUILDING_BLOCK_storeGet: StoreGet = (store, atom, ...buildingBlocks) => {
  const BB_readAtomState = buildingBlocks[14]
  return returnAtomValue(
    BB_readAtomState(store, atom, ...buildingBlocks),
  ) as any
}

const BUILDING_BLOCK_storeSet: StoreSet = (
  store,
  atom,
  args,
  ...buildingBlocks
) => {
  const BB_changedAtoms = buildingBlocks[3]
  const BB_flushCallbacks = buildingBlocks[12]
  const BB_recomputeInvalidatedAtoms = buildingBlocks[13]
  const BB_writeAtomState = buildingBlocks[16]
  const prevChangedAtomsSize = BB_changedAtoms.size
  try {
    return BB_writeAtomState(store, atom, args, ...buildingBlocks) as any
  } finally {
    if (BB_changedAtoms.size !== prevChangedAtomsSize) {
      BB_recomputeInvalidatedAtoms(store, ...buildingBlocks)
      BB_flushCallbacks(store, ...buildingBlocks)
    }
  }
}

const BUILDING_BLOCK_storeSub: StoreSub = (
  store,
  atom,
  listener,
  ...buildingBlocks
) => {
  const BB_flushCallbacks = buildingBlocks[12]
  const BB_mountAtom = buildingBlocks[18]
  const BB_unmountAtom = buildingBlocks[19]
  const mounted = BB_mountAtom(store, atom, ...buildingBlocks)
  const listeners = mounted.l
  listeners.add(listener)
  BB_flushCallbacks(store, ...buildingBlocks)
  return () => {
    listeners.delete(listener)
    BB_unmountAtom(store, atom, ...buildingBlocks)
    BB_flushCallbacks(store, ...buildingBlocks)
  }
}

const BUILDING_BLOCK_registerAbortHandler: RegisterAbortHandler = (
  _store,
  promise,
  abortHandler,
  ...buildingBlocks
) => {
  const BB_abortHandlersMap = buildingBlocks[25]
  let abortHandlers = BB_abortHandlersMap.get(promise)
  if (!abortHandlers) {
    abortHandlers = new Set()
    BB_abortHandlersMap.set(promise, abortHandlers)
    const cleanup = () => BB_abortHandlersMap.delete(promise)
    promise.then(cleanup, cleanup)
  }
  abortHandlers.add(abortHandler)
}

const BUILDING_BLOCK_abortPromise: AbortPromise = (
  promise,
  ...buildingBlocks
) => {
  const BB_abortHandlersMap = buildingBlocks[25]
  const abortHandlers = BB_abortHandlersMap.get(promise)
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
  const BB_enhanceBuildingBlocks = buildingBlocks[24]
  if (BB_enhanceBuildingBlocks) {
    return BB_enhanceBuildingBlocks(buildingBlocks)
  }
  return buildingBlocks
}

function buildStore(...buildArgs: Partial<BuildingBlocks>): Store {
  const store = {
    get(atom) {
      const BB_storeGet = buildingBlocks[21]
      return BB_storeGet(store, atom, ...buildingBlocks)
    },
    set(atom, ...args) {
      const BB_storeSet = buildingBlocks[22]
      return BB_storeSet(store, atom, args, ...buildingBlocks)
    },
    sub(atom, listener) {
      const BB_storeSub = buildingBlocks[23]
      return BB_storeSub(store, atom, listener, ...buildingBlocks)
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
  buildingBlockMap.set(store, Object.freeze(buildingBlocks))
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

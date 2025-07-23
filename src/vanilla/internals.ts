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

type AtomStateMap = {
  get(atom: AnyAtom): AtomState | undefined
  set(atom: AnyAtom, atomState: AtomState): void
}
type MountedMap = {
  get(atom: AnyAtom): Mounted | undefined
  has(atom: AnyAtom): boolean
  set(atom: AnyAtom, mounted: Mounted): void
  delete(atom: AnyAtom): void
}
type InvalidatedAtoms = {
  get(atom: AnyAtom): EpochNumber | undefined
  has(atom: AnyAtom): boolean
  set(atom: AnyAtom, n: EpochNumber): void
  delete(atom: AnyAtom): void
}
type ChangedAtoms = {
  readonly size: number
  add(atom: AnyAtom): void
  has(atom: AnyAtom): boolean
  clear(): void
  forEach(callback: (atom: AnyAtom) => void): void
  [Symbol.iterator](): IterableIterator<AnyAtom>
}
type Callbacks = {
  readonly size: number
  add(fn: () => void): void
  clear(): void
  forEach(callback: (fn: () => void) => void): void
}

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
  atomStateMap: AtomStateMap, //                             0
  mountedMap: MountedMap, //                                 1
  invalidatedAtoms: InvalidatedAtoms, //                     2
  changedAtoms: ChangedAtoms, //                             3
  mountCallbacks: Callbacks, //                              4
  unmountCallbacks: Callbacks, //                            5
  storeHooks: StoreHooks, //                                 6
  // atom interceptors
  atomRead: AtomRead, //                                     7
  atomWrite: AtomWrite, //                                   8
  atomOnInit: AtomOnInit, //                                 9
  atomOnMount: AtomOnMount, //                               10
  // building-block functions
  ensureAtomState: EnsureAtomState, //                       11
  flushCallbacks: FlushCallbacks, //                         12
  recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms, //   13
  readAtomState: ReadAtomState, //                           14
  invalidateDependents: InvalidateDependents, //             15
  writeAtomState: WriteAtomState, //                         16
  mountDependencies: MountDependencies, //                   17
  mountAtom: MountAtom, //                                   18
  unmountAtom: UnmountAtom, //                               19
  setAtomStateValueOrPromise: SetAtomStateValueOrPromise, // 20
  // store api
  storeGet: StoreGet, //                                     21
  storeSet: StoreSet, //                                     22
  storeSub: StoreSub, //                                     23
]

export type INTERNAL_AtomState<Value = AnyValue> = AtomState<Value>
export type INTERNAL_Mounted = Mounted
export type INTERNAL_AtomStateMap = AtomStateMap
export type INTERNAL_MountedMap = MountedMap
export type INTERNAL_InvalidatedAtoms = InvalidatedAtoms
export type INTERNAL_ChangedAtoms = ChangedAtoms
export type INTERNAL_Callbacks = Callbacks
export type INTERNAL_AtomRead = AtomRead
export type INTERNAL_AtomWrite = AtomWrite
export type INTERNAL_AtomOnInit = AtomOnInit
export type INTERNAL_AtomOnMount = AtomOnMount
export type INTERNAL_EnsureAtomState = EnsureAtomState
export type INTERNAL_FlushCallbacks = FlushCallbacks
export type INTERNAL_RecomputeInvalidatedAtoms = RecomputeInvalidatedAtoms
export type INTERNAL_ReadAtomState = ReadAtomState
export type INTERNAL_InvalidateDependents = InvalidateDependents
export type INTERNAL_WriteAtomState = WriteAtomState
export type INTERNAL_MountDependencies = MountDependencies
export type INTERNAL_MountAtom = MountAtom
export type INTERNAL_UnmountAtom = UnmountAtom
export type INTERNAL_Store = Store
export type INTERNAL_BuildingBlocks = BuildingBlocks
export type INTERNAL_StoreHooks = StoreHooks

//
// Some util functions
//

// TODO this will be gone soon
function isSelfAtom(atom: AnyAtom, a: AnyAtom): boolean {
  return atom.unstable_is ? atom.unstable_is(a) : a === atom
}

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

//
// Abortable Promise
//

const promiseStateMap: WeakMap<
  PromiseLike<unknown>,
  [pending: boolean, abortHandlers: Set<() => void>]
> = new WeakMap()

function isPendingPromise(value: unknown): value is PromiseLike<unknown> {
  return isPromiseLike(value) && !!promiseStateMap.get(value as never)?.[0]
}

function abortPromise<T>(promise: PromiseLike<T>): void {
  const promiseState = promiseStateMap.get(promise)
  if (promiseState?.[0]) {
    promiseState[0] = false
    promiseState[1].forEach((fn) => fn())
  }
}

function registerAbortHandler<T>(
  promise: PromiseLike<T>,
  abortHandler: () => void,
): void {
  let promiseState = promiseStateMap.get(promise)
  if (!promiseState) {
    promiseState = [true, new Set()]
    promiseStateMap.set(promise, promiseState)
    const settle = () => {
      promiseState![0] = false
    }
    promise.then(settle, settle)
  }
  promiseState[1].add(abortHandler)
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
    promise.then(
      () => {
        dependencyAtomState.p.delete(atom)
      },
      () => {
        dependencyAtomState.p.delete(atom)
      },
    )
  }
}

// TODO(daishi): revisit this implementation
function getMountedOrPendingDependents(
  atom: AnyAtom,
  atomState: AtomState,
  mountedMap: MountedMap,
): Set<AnyAtom> {
  const dependents = new Set<AnyAtom>()
  for (const a of mountedMap.get(atom)?.t || []) {
    if (mountedMap.has(a)) {
      dependents.add(a)
    }
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

type StoreHooks = {
  /**
   * Listener to notify when the atom value is changed.
   * This is an experimental API.
   */
  readonly c?: StoreHookForAtoms
  /**
   * Listener to notify when the atom is mounted.
   * This is an experimental API.
   */
  readonly m?: StoreHookForAtoms
  /**
   * Listener to notify when the atom is unmounted.
   * This is an experimental API.
   */
  readonly u?: StoreHookForAtoms
  /**
   * Listener to notify when callbacks are being flushed.
   * This is an experimental API.
   */
  readonly f?: StoreHook
}

const createStoreHook = (): StoreHook => {
  const callbacks = new Set<() => void>()
  const notify = () => {
    callbacks.forEach((fn) => fn())
  }
  notify.add = (fn: () => void) => {
    callbacks.add(fn)
    return () => {
      callbacks.delete(fn)
    }
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
    const fns = (
      callbacks.has(key) ? callbacks : callbacks.set(key, new Set())
    ).get(key)!
    fns.add(fn)
    return () => {
      fns?.delete(fn)
      if (!fns.size) {
        callbacks.delete(key)
      }
    }
  }
  return notify as StoreHookForAtoms
}

function initializeStoreHooks(storeHooks: StoreHooks): Required<StoreHooks> {
  type SH = { -readonly [P in keyof StoreHooks]: StoreHooks[P] }
  ;(storeHooks as SH).c ||= createStoreHookForAtoms()
  ;(storeHooks as SH).m ||= createStoreHookForAtoms()
  ;(storeHooks as SH).u ||= createStoreHookForAtoms()
  ;(storeHooks as SH).f ||= createStoreHook()
  return storeHooks as Required<StoreHooks>
}

//
// Main functions
//

const atomRead: AtomRead = (_store, atom, ...params) => atom.read(...params)
const atomWrite: AtomWrite = (_store, atom, ...params) => atom.write(...params)
const atomOnInit: AtomOnInit = (store, atom) => atom.unstable_onInit?.(store)
const atomOnMount: AtomOnMount = (_store, atom, setAtom) =>
  atom.onMount?.(setAtom)

const ensureAtomState: EnsureAtomState = (store, atom) => {
  const atomStateMap = getBuildingBlocks(store)[0]
  const atomOnInit = getBuildingBlocks(store)[9]
  if (import.meta.env?.MODE !== 'production' && !atom) {
    throw new Error('Atom is undefined or null')
  }
  let atomState = atomStateMap.get(atom)
  if (!atomState) {
    atomState = { d: new Map(), p: new Set(), n: 0 }
    atomStateMap.set(atom, atomState)
    atomOnInit?.(store, atom)
  }
  return atomState as never
}

const flushCallbacks: FlushCallbacks = (store) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const changedAtoms = getBuildingBlocks(store)[3]
  const mountCallbacks = getBuildingBlocks(store)[4]
  const unmountCallbacks = getBuildingBlocks(store)[5]
  const storeHooks = getBuildingBlocks(store)[6]
  const recomputeInvalidatedAtoms = getBuildingBlocks(store)[13]
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
      recomputeInvalidatedAtoms(store)
    }
  } while (changedAtoms.size || unmountCallbacks.size || mountCallbacks.size)
  if (errors.length) {
    throw new AggregateError(errors)
  }
}

const recomputeInvalidatedAtoms: RecomputeInvalidatedAtoms = (store) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const invalidatedAtoms = getBuildingBlocks(store)[2]
  const changedAtoms = getBuildingBlocks(store)[3]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const readAtomState = getBuildingBlocks(store)[14]
  const mountDependencies = getBuildingBlocks(store)[17]
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
    const aState = ensureAtomState(store, a)
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
      readAtomState(store, a)
      mountDependencies(store, a)
    }
    invalidatedAtoms.delete(a)
  }
}

const readAtomState: ReadAtomState = (store, atom) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const invalidatedAtoms = getBuildingBlocks(store)[2]
  const changedAtoms = getBuildingBlocks(store)[3]
  const storeHooks = getBuildingBlocks(store)[6]
  const atomRead = getBuildingBlocks(store)[7]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const flushCallbacks = getBuildingBlocks(store)[12]
  const recomputeInvalidatedAtoms = getBuildingBlocks(store)[13]
  const readAtomState = getBuildingBlocks(store)[14]
  const writeAtomState = getBuildingBlocks(store)[16]
  const mountDependencies = getBuildingBlocks(store)[17]
  const atomState = ensureAtomState(store, atom)
  // See if we can skip recomputing this atom.
  if (isAtomStateInitialized(atomState)) {
    // If the atom is mounted, we can use cached atom state.
    // because it should have been updated by dependencies.
    // We can't use the cache if the atom is invalidated.
    if (mountedMap.has(atom) && invalidatedAtoms.get(atom) !== atomState.n) {
      return atomState
    }
    // Otherwise, check if the dependencies have changed.
    // If all dependencies haven't changed, we can use the cache.
    if (
      Array.from(atomState.d).every(
        ([a, n]) =>
          // Recursively, read the atom state of the dependency, and
          // check if the atom epoch number is unchanged
          readAtomState(store, a).n === n,
      )
    ) {
      return atomState
    }
  }
  // Compute a new state for this atom.
  atomState.d.clear()
  let isSync = true
  function mountDependenciesIfAsync() {
    if (mountedMap.has(atom)) {
      mountDependencies(store, atom)
      recomputeInvalidatedAtoms(store)
      flushCallbacks(store)
    }
  }
  function getter<V>(a: Atom<V>) {
    if (isSelfAtom(atom, a)) {
      const aState = ensureAtomState(store, a)
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
      atomState.d.set(a, aState.n)
      if (isPendingPromise(atomState.v)) {
        addPendingPromiseToDependency(atom, atomState.v, aState)
      }
      mountedMap.get(a)?.t.add(atom)
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
              return writeAtomState(store, atom, ...args)
            } finally {
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
  try {
    const valueOrPromise = atomRead(store, atom, getter, options as never)
    setAtomStateValueOrPromise(store, atom, valueOrPromise)
    if (isPromiseLike(valueOrPromise)) {
      registerAbortHandler(valueOrPromise, () => controller?.abort())
      valueOrPromise.then(mountDependenciesIfAsync, mountDependenciesIfAsync)
    }
    return atomState
  } catch (error) {
    delete atomState.v
    atomState.e = error
    ++atomState.n
    return atomState
  } finally {
    isSync = false
    if (
      prevEpochNumber !== atomState.n &&
      invalidatedAtoms.get(atom) === prevEpochNumber
    ) {
      invalidatedAtoms.set(atom, atomState.n)
      changedAtoms.add(atom)
      storeHooks.c?.(atom)
    }
  }
}

const invalidateDependents: InvalidateDependents = (store, atom) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const invalidatedAtoms = getBuildingBlocks(store)[2]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const stack: AnyAtom[] = [atom]
  while (stack.length) {
    const a = stack.pop()!
    const aState = ensureAtomState(store, a)
    for (const d of getMountedOrPendingDependents(a, aState, mountedMap)) {
      const dState = ensureAtomState(store, d)
      invalidatedAtoms.set(d, dState.n)
      stack.push(d)
    }
  }
}

const writeAtomState: WriteAtomState = (store, atom, ...args) => {
  const changedAtoms = getBuildingBlocks(store)[3]
  const storeHooks = getBuildingBlocks(store)[6]
  const atomWrite = getBuildingBlocks(store)[8]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const flushCallbacks = getBuildingBlocks(store)[12]
  const recomputeInvalidatedAtoms = getBuildingBlocks(store)[13]
  const readAtomState = getBuildingBlocks(store)[14]
  const invalidateDependents = getBuildingBlocks(store)[15]
  const mountDependencies = getBuildingBlocks(store)[17]
  let isSync = true
  const getter: Getter = <V>(a: Atom<V>) =>
    returnAtomValue(readAtomState(store, a))
  const setter: Setter = <V, As extends unknown[], R>(
    a: WritableAtom<V, As, R>,
    ...args: As
  ) => {
    const aState = ensureAtomState(store, a)
    try {
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const prevEpochNumber = aState.n
        const v = args[0] as V
        setAtomStateValueOrPromise(store, a, v)
        mountDependencies(store, a)
        if (prevEpochNumber !== aState.n) {
          changedAtoms.add(a)
          storeHooks.c?.(a)
          invalidateDependents(store, a)
        }
        return undefined as R
      } else {
        return writeAtomState(store, a, ...args)
      }
    } finally {
      if (!isSync) {
        recomputeInvalidatedAtoms(store)
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

const mountDependencies: MountDependencies = (store, atom) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const changedAtoms = getBuildingBlocks(store)[3]
  const storeHooks = getBuildingBlocks(store)[6]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const invalidateDependents = getBuildingBlocks(store)[15]
  const mountAtom = getBuildingBlocks(store)[18]
  const unmountAtom = getBuildingBlocks(store)[19]
  const atomState = ensureAtomState(store, atom)
  const mounted = mountedMap.get(atom)
  if (mounted && !isPendingPromise(atomState.v)) {
    for (const [a, n] of atomState.d) {
      if (!mounted.d.has(a)) {
        const aState = ensureAtomState(store, a)
        const aMounted = mountAtom(store, a)
        aMounted.t.add(atom)
        mounted.d.add(a)
        if (n !== aState.n) {
          changedAtoms.add(a)
          storeHooks.c?.(a)
          invalidateDependents(store, a)
        }
      }
    }
    for (const a of mounted.d || []) {
      if (!atomState.d.has(a)) {
        mounted.d.delete(a)
        const aMounted = unmountAtom(store, a)
        aMounted?.t.delete(atom)
      }
    }
  }
}

const mountAtom: MountAtom = (store, atom) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const mountCallbacks = getBuildingBlocks(store)[4]
  const storeHooks = getBuildingBlocks(store)[6]
  const atomOnMount = getBuildingBlocks(store)[10]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const flushCallbacks = getBuildingBlocks(store)[12]
  const recomputeInvalidatedAtoms = getBuildingBlocks(store)[13]
  const readAtomState = getBuildingBlocks(store)[14]
  const writeAtomState = getBuildingBlocks(store)[16]
  const atomState = ensureAtomState(store, atom)
  let mounted = mountedMap.get(atom)
  if (!mounted) {
    // recompute atom state
    readAtomState(store, atom)
    // mount dependencies first
    for (const a of atomState.d.keys()) {
      const aMounted = mountAtom(store, a)
      aMounted.t.add(atom)
    }
    // mount self
    mounted = {
      l: new Set(),
      d: new Set(atomState.d.keys()),
      t: new Set(),
    }
    mountedMap.set(atom, mounted)
    storeHooks.m?.(atom)
    if (isActuallyWritableAtom(atom)) {
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: unknown[]) => {
          try {
            return writeAtomState(store, atom, ...args)
          } finally {
            if (!isSync) {
              recomputeInvalidatedAtoms(store)
              flushCallbacks(store)
            }
          }
        }
        try {
          const onUnmount = atomOnMount(store, atom, setAtom)
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
  }
  return mounted
}

const unmountAtom: UnmountAtom = (store, atom) => {
  const mountedMap = getBuildingBlocks(store)[1]
  const unmountCallbacks = getBuildingBlocks(store)[5]
  const storeHooks = getBuildingBlocks(store)[6]
  const ensureAtomState = getBuildingBlocks(store)[11]
  const unmountAtom = getBuildingBlocks(store)[19]
  const atomState = ensureAtomState(store, atom)
  let mounted = mountedMap.get(atom)
  if (
    mounted &&
    !mounted.l.size &&
    !Array.from(mounted.t).some((a) => mountedMap.get(a)?.d.has(atom))
  ) {
    // unmount self
    if (mounted.u) {
      unmountCallbacks.add(mounted.u)
    }
    mounted = undefined
    mountedMap.delete(atom)
    storeHooks.u?.(atom)
    // unmount dependencies
    for (const a of atomState.d.keys()) {
      const aMounted = unmountAtom(store, a)
      aMounted?.t.delete(atom)
    }
    return undefined
  }
  return mounted
}

// TODO(daishi): revisit this implementation
const setAtomStateValueOrPromise = (
  store: Store,
  atom: AnyAtom,
  valueOrPromise: unknown,
): void => {
  const ensureAtomState = getBuildingBlocks(store)[11]
  const atomState = ensureAtomState(store, atom)
  const hasPrevValue = 'v' in atomState
  const prevValue = atomState.v
  if (isPromiseLike(valueOrPromise)) {
    for (const a of atomState.d.keys()) {
      addPendingPromiseToDependency(
        atom,
        valueOrPromise,
        ensureAtomState(store, a),
      )
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

const storeGet: StoreGet = (store, atom) => {
  const readAtomState = getBuildingBlocks(store)[14]
  return returnAtomValue(readAtomState(store, atom)) as any
}

const storeSet: StoreSet = (store, atom, ...args) => {
  const flushCallbacks = getBuildingBlocks(store)[12]
  const recomputeInvalidatedAtoms = getBuildingBlocks(store)[13]
  const writeAtomState = getBuildingBlocks(store)[16]
  try {
    return writeAtomState(store, atom, ...args) as any
  } finally {
    recomputeInvalidatedAtoms(store)
    flushCallbacks(store)
  }
}

const storeSub: StoreSub = (store, atom, listener) => {
  const flushCallbacks = getBuildingBlocks(store)[12]
  const mountAtom = getBuildingBlocks(store)[18]
  const unmountAtom = getBuildingBlocks(store)[19]
  const mounted = mountAtom(store, atom)
  const listeners = mounted.l
  listeners.add(listener)
  flushCallbacks(store)
  return () => {
    listeners.delete(listener)
    unmountAtom(store, atom)
    flushCallbacks(store)
  }
}

const BUILDING_BLOCKS: unique symbol = Symbol() // no description intentionally

function getBuildingBlocks(store: unknown): BuildingBlocks {
  return (store as any)[BUILDING_BLOCKS]
}

function buildStore(...buildArgs: Partial<BuildingBlocks>): Store {
  const store = {
    get(atom) {
      const storeGet = getBuildingBlocks(store)[21]
      return storeGet(store, atom)
    },
    set(atom, ...args) {
      const storeSet = getBuildingBlocks(store)[22]
      return storeSet(store, atom, ...args)
    },
    sub(atom, listener) {
      const storeSub = getBuildingBlocks(store)[23]
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
      atomRead,
      atomWrite,
      atomOnInit,
      atomOnMount,
      // building-block functions
      ensureAtomState,
      flushCallbacks,
      recomputeInvalidatedAtoms,
      readAtomState,
      invalidateDependents,
      writeAtomState,
      mountDependencies,
      mountAtom,
      unmountAtom,
      setAtomStateValueOrPromise,
      storeGet,
      storeSet,
      storeSub,
    ] satisfies BuildingBlocks
  ).map((fn, i) => buildArgs[i] || fn) as BuildingBlocks
  Object.defineProperty(store, BUILDING_BLOCKS, { value: buildingBlocks })
  return store
}

//
// Export internal functions
//

export const INTERNAL_buildStoreRev1: typeof buildStore = buildStore
export const INTERNAL_getBuildingBlocksRev1: typeof getBuildingBlocks =
  getBuildingBlocks
export const INTERNAL_initializeStoreHooks: typeof initializeStoreHooks =
  initializeStoreHooks

//
// Still experimental and some of them will be gone soon
//

export const INTERNAL_isSelfAtom: typeof isSelfAtom = isSelfAtom
export const INTERNAL_hasInitialValue: typeof hasInitialValue = hasInitialValue
export const INTERNAL_isActuallyWritableAtom: typeof isActuallyWritableAtom =
  isActuallyWritableAtom
export const INTERNAL_isAtomStateInitialized: typeof isAtomStateInitialized =
  isAtomStateInitialized
export const INTERNAL_returnAtomValue: typeof returnAtomValue = returnAtomValue
export const INTERNAL_promiseStateMap: typeof promiseStateMap = promiseStateMap
export const INTERNAL_isPendingPromise: typeof isPendingPromise =
  isPendingPromise
export const INTERNAL_abortPromise: typeof abortPromise = abortPromise
export const INTERNAL_registerAbortHandler: typeof registerAbortHandler =
  registerAbortHandler
export const INTERNAL_isPromiseLike: typeof isPromiseLike = isPromiseLike
export const INTERNAL_addPendingPromiseToDependency: typeof addPendingPromiseToDependency =
  addPendingPromiseToDependency
export const INTERNAL_getMountedOrPendingDependents: typeof getMountedOrPendingDependents =
  getMountedOrPendingDependents

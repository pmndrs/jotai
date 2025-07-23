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
  this: BuildingBlocks,
  atom: Atom<Value>,
  ...params: Parameters<Atom<Value>['read']>
) => Value
type AtomWrite = <Value, Args extends unknown[], Result>(
  this: BuildingBlocks,
  atom: WritableAtom<Value, Args, Result>,
  ...params: Parameters<WritableAtom<Value, Args, Result>['write']>
) => Result
type AtomOnInit = <Value>(this: BuildingBlocks, atom: Atom<Value>) => void
type AtomOnMount = <Value, Args extends unknown[], Result>(
  this: BuildingBlocks,
  atom: WritableAtom<Value, Args, Result>,
  setAtom: (...args: Args) => Result,
) => OnUnmount | void

type EnsureAtomState = <Value>(
  this: BuildingBlocks,
  atom: Atom<Value>,
) => AtomState<Value>
type FlushCallbacks = (this: BuildingBlocks) => void
type RecomputeInvalidatedAtoms = (this: BuildingBlocks) => void
type ReadAtomState = <Value>(
  this: BuildingBlocks,
  atom: Atom<Value>,
) => AtomState<Value>
type InvalidateDependents = (this: BuildingBlocks, atom: AnyAtom) => void
type WriteAtomState = <Value, Args extends unknown[], Result>(
  this: BuildingBlocks,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
type MountDependencies = (this: BuildingBlocks, atom: AnyAtom) => void
type MountAtom = <Value>(this: BuildingBlocks, atom: Atom<Value>) => Mounted
type UnmountAtom = <Value>(
  this: BuildingBlocks,
  atom: Atom<Value>,
) => Mounted | undefined
type SetAtomStateValueOrPromise = <Value>(
  this: BuildingBlocks,
  atom: Atom<Value>,
  valueOrPromise: Value,
) => void
type StoreGet = <Value>(this: BuildingBlocks, atom: Atom<Value>) => Value
type StoreSet = <Value, Args extends unknown[], Result>(
  this: BuildingBlocks,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
) => Result
type StoreSub = (
  this: BuildingBlocks,
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
const atomStateMap = 0 as const,
  mountedMap = 1 as const,
  invalidatedAtoms = 2 as const,
  changedAtoms = 3 as const,
  mountCallbacks = 4 as const,
  unmountCallbacks = 5 as const,
  storeHooks = 6 as const,
  atomRead = 7 as const,
  atomWrite = 8 as const,
  atomOnInit = 9 as const,
  atomOnMount = 10 as const,
  ensureAtomState = 11 as const,
  flushCallbacks = 12 as const,
  recomputeInvalidatedAtoms = 13 as const,
  readAtomState = 14 as const,
  invalidateDependents = 15 as const,
  writeAtomState = 16 as const,
  mountDependencies = 17 as const,
  mountAtom = 18 as const,
  unmountAtom = 19 as const,
  setAtomStateValueOrPromise = 20 as const,
  storeGet = 21 as const,
  storeSet = 22 as const,
  storeSub = 23 as const,
  store = 24 as const

type BuildingBlocks = [
  // store state
  AtomStateMap,
  MountedMap,
  InvalidatedAtoms,
  ChangedAtoms,
  Callbacks,
  Callbacks,
  StoreHooks,
  // atom interceptor
  AtomRead,
  AtomWrite,
  AtomOnInit,
  AtomOnMount,
  // building-block functions
  EnsureAtomState,
  FlushCallbacks,
  RecomputeInvalidatedAtoms,
  ReadAtomState,
  InvalidateDependents,
  WriteAtomState,
  MountDependencies,
  MountAtom,
  UnmountAtom,
  SetAtomStateValueOrPromise,
  // store api
  StoreGet,
  StoreSet,
  StoreSub,
  Store,
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
    const cleanup = () => dependencyAtomState.p.delete(atom)
    promise.then(cleanup, cleanup)
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
const buildingBlocks = {
  [atomStateMap]: new WeakMap(),
  [mountedMap]: new WeakMap(),
  [invalidatedAtoms]: new WeakMap(),
  [changedAtoms]: new Set(),
  [mountCallbacks]: new Set(),
  [unmountCallbacks]: new Set(),
  [storeHooks]: {},
  [store]: null as any,
  [atomRead](this, atom, ...params) {
    return atom.read(...params)
  },
  [atomWrite](this, atom, ...params) {
    return atom.write(...params)
  },
  [atomOnInit](this, atom) {
    return atom.unstable_onInit?.(this[store])
  },
  [atomOnMount](this, atom, setAtom) {
    return atom.onMount?.(setAtom)
  },
  [ensureAtomState](this, atom) {
    if (import.meta.env?.MODE !== 'production' && !atom) {
      throw new Error('Atom is undefined or null')
    }
    let atomState = this[atomStateMap].get(atom)
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      this[atomStateMap].set(atom, atomState)
      this[atomOnInit]?.(atom)
    }
    return atomState as never
  },
  [flushCallbacks](this) {
    const errors: unknown[] = []
    const call = (fn: () => void) => {
      try {
        fn()
      } catch (e) {
        errors.push(e)
      }
    }
    do {
      if (this[storeHooks].f) {
        call(this[storeHooks].f)
      }
      const callbacks = new Set<() => void>()
      const add = callbacks.add.bind(callbacks)
      this[changedAtoms].forEach((atom) =>
        this[mountedMap].get(atom)?.l.forEach(add),
      )
      this[changedAtoms].clear()
      this[unmountCallbacks].forEach(add)
      this[unmountCallbacks].clear()
      this[mountCallbacks].forEach(add)
      this[mountCallbacks].clear()
      callbacks.forEach(call)
      if (this[changedAtoms].size) {
        this[recomputeInvalidatedAtoms]()
      }
    } while (
      this[changedAtoms].size ||
      this[unmountCallbacks].size ||
      this[mountCallbacks].size
    )
    if (errors.length) {
      throw new AggregateError(errors)
    }
  },
  [recomputeInvalidatedAtoms](this) {
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
    const stack: AnyAtom[] = Array.from(this[changedAtoms])
    while (stack.length) {
      const a = stack[stack.length - 1]!
      const aState = this[ensureAtomState](a)
      if (visited.has(a)) {
        // All dependents have been processed, now process this atom
        stack.pop()
        continue
      }
      if (visiting.has(a)) {
        // The algorithm calls for pushing onto the front of the list. For
        // performance, we will simply push onto the end, and then will iterate in
        // reverse order later.
        if (this[invalidatedAtoms].get(a) === aState.n) {
          topSortedReversed.push([a, aState])
        } else if (
          import.meta.env?.MODE !== 'production' &&
          this[invalidatedAtoms].has(a)
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
      for (const d of getMountedOrPendingDependents(
        a,
        aState,
        this[mountedMap],
      )) {
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
        if (dep !== a && this[changedAtoms].has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        this[readAtomState](a)
        this[mountDependencies](a)
      }
      this[invalidatedAtoms].delete(a)
    }
  },
  [readAtomState](this, atom) {
    const atomState = this[ensureAtomState](atom)
    // See if we can skip recomputing this atom.
    if (isAtomStateInitialized(atomState)) {
      // If the atom is mounted, we can use cached atom state.
      // because it should have been updated by dependencies.
      // We can't use the cache if the atom is invalidated.
      if (
        this[mountedMap].has(atom) &&
        this[invalidatedAtoms].get(atom) !== atomState.n
      ) {
        return atomState
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      if (
        Array.from(atomState.d).every(
          ([a, n]) =>
            // Recursively, read the atom state of the dependency, and
            // check if the atom epoch number is unchanged
            this[readAtomState](a).n === n,
        )
      ) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    atomState.d.clear()
    let isSync = true
    const mountDependenciesIfAsync = () => {
      if (this[mountedMap].has(atom)) {
        this[mountDependencies](atom)
        this[recomputeInvalidatedAtoms]()
        this[flushCallbacks]()
      }
    }
    const getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = this[ensureAtomState](a)
        if (!isAtomStateInitialized(aState)) {
          if (hasInitialValue(a)) {
            this[setAtomStateValueOrPromise](a, a.init)
          } else {
            // NOTE invalid derived atoms can reach here
            throw new Error('no atom init')
          }
        }
        return returnAtomValue(aState)
      }
      // a !== atom
      const aState = this[readAtomState](a)
      try {
        return returnAtomValue(aState)
      } finally {
        atomState.d.set(a, aState.n)
        if (isPendingPromise(atomState.v)) {
          addPendingPromiseToDependency(atom, atomState.v, aState)
        }
        this[mountedMap].get(a)?.t.add(atom)
        if (!isSync) {
          mountDependenciesIfAsync()
        }
      }
    }
    let controller: AbortController | undefined
    let setSelf: ((...args: unknown[]) => unknown) | undefined
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const buildingBlocks = this
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
                return buildingBlocks[writeAtomState](atom, ...args)
              } finally {
                buildingBlocks[recomputeInvalidatedAtoms]()
                buildingBlocks[flushCallbacks]()
              }
            }
          }
        }
        return setSelf
      },
    }
    const prevEpochNumber = atomState.n
    try {
      const valueOrPromise = this[atomRead](atom, getter, options as never)
      this[setAtomStateValueOrPromise](atom, valueOrPromise)
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
        this[invalidatedAtoms].get(atom) === prevEpochNumber
      ) {
        this[invalidatedAtoms].set(atom, atomState.n)
        this[changedAtoms].add(atom)
        this[storeHooks].c?.(atom)
      }
    }
  },
  [invalidateDependents](this, atom) {
    const stack: AnyAtom[] = [atom]
    while (stack.length) {
      const a = stack.pop()!
      const aState = this[ensureAtomState](a)
      for (const d of getMountedOrPendingDependents(
        a,
        aState,
        this[mountedMap],
      )) {
        const dState = this[ensureAtomState](d)
        this[invalidatedAtoms].set(d, dState.n)
        stack.push(d)
      }
    }
  },
  [writeAtomState](this, atom, ...args) {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) =>
      returnAtomValue(this[readAtomState](a))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      const aState = this[ensureAtomState](a)
      try {
        if (isSelfAtom(atom, a)) {
          if (!hasInitialValue(a)) {
            // NOTE technically possible but restricted as it may cause bugs
            throw new Error('atom not writable')
          }
          const prevEpochNumber = aState.n
          const v = args[0] as V
          this[setAtomStateValueOrPromise](a, v)
          this[mountDependencies](a)
          if (prevEpochNumber !== aState.n) {
            this[changedAtoms].add(a)
            this[storeHooks].c?.(a)
            this[invalidateDependents](a)
          }
          return undefined as R
        } else {
          return this[writeAtomState](a, ...args)
        }
      } finally {
        if (!isSync) {
          this[recomputeInvalidatedAtoms]()
          this[flushCallbacks]()
        }
      }
    }
    try {
      return this[atomWrite](atom, getter, setter, ...args)
    } finally {
      isSync = false
    }
  },
  [mountDependencies](this, atom) {
    const atomState = this[ensureAtomState](atom)
    const mounted = this[mountedMap].get(atom)
    if (mounted && !isPendingPromise(atomState.v)) {
      for (const [a, n] of atomState.d) {
        if (!mounted.d.has(a)) {
          const aState = this[ensureAtomState](a)
          const aMounted = this[mountAtom](a)
          aMounted.t.add(atom)
          mounted.d.add(a)
          if (n !== aState.n) {
            this[changedAtoms].add(a)
            this[storeHooks].c?.(a)
            this[invalidateDependents](a)
          }
        }
      }
      for (const a of mounted.d || []) {
        if (!atomState.d.has(a)) {
          mounted.d.delete(a)
          const aMounted = this[unmountAtom](a)
          aMounted?.t.delete(atom)
        }
      }
    }
  },
  [mountAtom](this, atom) {
    const atomState = this[ensureAtomState](atom)
    let mounted = this[mountedMap].get(atom)
    if (!mounted) {
      // recompute atom state
      this[readAtomState](atom)
      // mount dependencies first
      for (const a of atomState.d.keys()) {
        const aMounted = this[mountAtom](a)
        aMounted.t.add(atom)
      }
      // mount self
      mounted = {
        l: new Set(),
        d: new Set(atomState.d.keys()),
        t: new Set(),
      }
      this[mountedMap].set(atom, mounted)
      this[storeHooks].m?.(atom)
      if (isActuallyWritableAtom(atom)) {
        const processOnMount = () => {
          let isSync = true
          const setAtom = (...args: unknown[]) => {
            try {
              return this[writeAtomState](atom, ...args)
            } finally {
              if (!isSync) {
                this[recomputeInvalidatedAtoms]()
                this[flushCallbacks]()
              }
            }
          }
          try {
            const onUnmount = this[atomOnMount](atom, setAtom)
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
        this[mountCallbacks].add(processOnMount)
      }
    }
    return mounted
  },
  [unmountAtom](this, atom) {
    const atomState = this[ensureAtomState](atom)
    let mounted = this[mountedMap].get(atom)
    if (
      mounted &&
      !mounted.l.size &&
      !Array.from(mounted.t).some((a) => this[mountedMap].get(a)?.d.has(atom))
    ) {
      // unmount self
      if (mounted.u) {
        this[unmountCallbacks].add(mounted.u)
      }
      mounted = undefined
      this[mountedMap].delete(atom)
      this[storeHooks].u?.(atom)
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        const aMounted = this[unmountAtom](a)
        aMounted?.t.delete(atom)
      }
      return undefined
    }
    return mounted
  },
  // TODO(daishi): revisit this implementation
  [setAtomStateValueOrPromise](this, atom, valueOrPromise) {
    const atomState = this[ensureAtomState](atom)
    const hasPrevValue = 'v' in atomState
    const prevValue = atomState.v
    if (isPromiseLike(valueOrPromise)) {
      for (const a of atomState.d.keys()) {
        addPendingPromiseToDependency(
          atom,
          valueOrPromise,
          this[ensureAtomState](a),
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
  },
  [storeGet](this, atom) {
    return returnAtomValue(this[readAtomState](atom)) as any
  },
  [storeSet](this, atom, ...args) {
    try {
      return this[writeAtomState](atom, ...args) as any
    } finally {
      this[recomputeInvalidatedAtoms]()
      this[flushCallbacks]()
    }
  },
  [storeSub](this, atom, listener) {
    const mounted = this[mountAtom](atom)
    const listeners = mounted.l
    listeners.add(listener)
    this[flushCallbacks]()
    return () => {
      listeners.delete(listener)
      this[unmountAtom](atom)
      this[flushCallbacks]()
    }
  },
} satisfies TupleToObject<BuildingBlocks> as unknown as BuildingBlocks

type Optional<T> = {
  [K in keyof T]?: T[K] | undefined
}

type TupleToObject<T extends readonly any[]> = {
  [K in keyof T as K extends `${infer N extends number}` ? N : never]: T[K]
}

function filterOptional<T extends readonly any[]>(
  obj: Optional<T>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

const BUILDING_BLOCKS: unique symbol = Symbol() // no description intentionally

function getBuildingBlocks(store: Store): BuildingBlocks {
  return (store as any)[BUILDING_BLOCKS]
}

function buildStore(buildArgs: Optional<BuildingBlocks> = []): Store {
  const storeObject: Store = {
    get: (atom) => {
      return getBuildingBlocks(storeObject)[storeGet](atom)
    },
    set: (atom, ...args) => {
      return getBuildingBlocks(storeObject)[storeSet](atom, ...args)
    },
    sub: (atom, listener) => {
      return getBuildingBlocks(storeObject)[storeSub](atom, listener)
    },
  }
  const storeBuildingBlocks: BuildingBlocks = Object.assign(
    [],
    buildingBlocks,
    {
      [atomStateMap]: new WeakMap(),
      [mountedMap]: new WeakMap(),
      [invalidatedAtoms]: new WeakMap(),
      [changedAtoms]: new Set(),
      [mountCallbacks]: new Set(),
      [unmountCallbacks]: new Set(),
      [storeHooks]: {},
      [store]: storeObject,
    } satisfies Partial<TupleToObject<BuildingBlocks>>,
    filterOptional(buildArgs),
  )
  Object.defineProperty(storeObject, BUILDING_BLOCKS, {
    value: Object.freeze(storeBuildingBlocks),
  })
  return storeObject
}

type getBuildingBlocksReadonly = (store: Store) => Readonly<BuildingBlocks>
const INTERNAL_getBuildingBlocksRev2 =
  getBuildingBlocks as getBuildingBlocksReadonly

export {
  //
  // Export internal functions
  //
  buildStore as INTERNAL_buildStoreRev2,
  INTERNAL_getBuildingBlocksRev2,
  initializeStoreHooks as INTERNAL_initializeStoreHooks,

  //
  // Still experimental and some of them will be gone soon
  //
  isSelfAtom as INTERNAL_isSelfAtom,
  hasInitialValue as INTERNAL_hasInitialValue,
  isActuallyWritableAtom as INTERNAL_isActuallyWritableAtom,
  isAtomStateInitialized as INTERNAL_isAtomStateInitialized,
  returnAtomValue as INTERNAL_returnAtomValue,
  promiseStateMap as INTERNAL_promiseStateMap,
  isPendingPromise as INTERNAL_isPendingPromise,
  abortPromise as INTERNAL_abortPromise,
  registerAbortHandler as INTERNAL_registerAbortHandler,
  isPromiseLike as INTERNAL_isPromiseLike,
  addPendingPromiseToDependency as INTERNAL_addPendingPromiseToDependency,
  getMountedOrPendingDependents as INTERNAL_getMountedOrPendingDependents,
}

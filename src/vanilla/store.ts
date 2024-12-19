import type { Atom, WritableAtom } from './atom.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]

const isSelfAtom = (atom: AnyAtom, a: AnyAtom): boolean =>
  atom.unstable_is ? atom.unstable_is(a) : a === atom

const hasInitialValue = <T extends Atom<AnyValue>>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

//
// Cancelable Promise
//

type CancelHandler = (nextValue: unknown) => void
type PromiseState = [cancelHandlers: Set<CancelHandler>, settled: boolean]

const cancelablePromiseMap = new WeakMap<PromiseLike<unknown>, PromiseState>()

const isPendingPromise = (value: unknown): value is PromiseLike<unknown> =>
  isPromiseLike(value) && !cancelablePromiseMap.get(value)?.[1]

const cancelPromise = <T>(promise: PromiseLike<T>, nextValue: unknown) => {
  const promiseState = cancelablePromiseMap.get(promise)
  if (promiseState) {
    promiseState[1] = true
    promiseState[0].forEach((fn) => fn(nextValue))
  } else if (import.meta.env?.MODE !== 'production') {
    throw new Error('[Bug] cancelable promise not found')
  }
}

const patchPromiseForCancelability = <T>(promise: PromiseLike<T>) => {
  if (cancelablePromiseMap.has(promise)) {
    // already patched
    return
  }
  const promiseState: PromiseState = [new Set(), false]
  cancelablePromiseMap.set(promise, promiseState)
  const settle = () => {
    promiseState[1] = true
  }
  promise.then(settle, settle)
  ;(promise as { onCancel?: (fn: CancelHandler) => void }).onCancel = (fn) => {
    promiseState[0].add(fn)
  }
}

const isPromiseLike = (
  x: unknown,
): x is PromiseLike<unknown> & { onCancel?: (fn: CancelHandler) => void } =>
  typeof (x as any)?.then === 'function'

/**
 * State tracked for mounted atoms. An atom is considered "mounted" if it has a
 * subscriber, or is a transitive dependency of another atom that has a
 * subscriber.
 *
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
  u?: (batch: Batch) => void
}

/**
 * Mutable atom state,
 * tracked for both mounted and unmounted atoms in a store.
 */
type AtomState<Value = AnyValue> = {
  /**
   * Map of atoms that the atom depends on.
   * The map value is the epoch number of the dependency.
   */
  readonly d: Map<AnyAtom, number>
  /**
   * Set of atoms with pending promise that depend on the atom.
   *
   * This may cause memory leaks, but it's for the capability to continue promises
   */
  readonly p: Set<AnyAtom>
  /** The epoch number of the atom. */
  n: number
  /** Object to store mounted state of the atom. */
  m?: Mounted // only available if the atom is mounted
  /** Atom value */
  v?: Value
  /** Atom error */
  e?: AnyError
  /** Indicates that the atom value has been changed */
  x?: true
}

const isAtomStateInitialized = <Value>(atomState: AtomState<Value>) =>
  'v' in atomState || 'e' in atomState

const returnAtomValue = <Value>(atomState: AtomState<Value>): Value => {
  if ('e' in atomState) {
    throw atomState.e
  }
  if (import.meta.env?.MODE !== 'production' && !('v' in atomState)) {
    throw new Error('[Bug] atom state is not initialized')
  }
  return atomState.v!
}

const addPendingPromiseToDependency = (
  atom: AnyAtom,
  promise: PromiseLike<AnyValue>,
  dependencyAtomState: AtomState,
) => {
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

const addDependency = <Value>(
  batch: Batch | undefined,
  atom: Atom<Value>,
  atomState: AtomState<Value>,
  a: AnyAtom,
  aState: AtomState,
) => {
  if (import.meta.env?.MODE !== 'production' && a === atom) {
    throw new Error('[Bug] atom cannot depend on itself')
  }
  atomState.d.set(a, aState.n)
  if (isPendingPromise(atomState.v)) {
    addPendingPromiseToDependency(atom, atomState.v, aState)
  }
  aState.m?.t.add(atom)
  if (batch) {
    addBatchAtomDependent(batch, a, atom)
  }
}

//
// Batch
//

type Batch = Readonly<{
  /** Atom dependents map */
  D: Map<AnyAtom, Set<AnyAtom>>
  /** High priority functions */
  H: Set<() => void>
  /** Medium priority functions */
  M: Set<() => void>
  /** Low priority functions */
  L: Set<() => void>
}>

type BatchPriority = 'H' | 'M' | 'L'

const createBatch = (): Batch => ({
  D: new Map(),
  H: new Set(),
  M: new Set(),
  L: new Set(),
})

const addBatchFunc = (batch: Batch, p: BatchPriority, fn: () => void) => {
  batch[p].add(fn)
}

const registerBatchAtom = (
  batch: Batch,
  atom: AnyAtom,
  atomState: AtomState,
) => {
  if (!batch.D.has(atom)) {
    batch.D.set(atom, new Set())
    addBatchFunc(batch, 'H', () => {
      for (const listener of atomState.m?.l || []) {
        let priority: BatchPriority = 'M'
        if ('INTERNAL_priority' in listener) {
          priority = listener.INTERNAL_priority as BatchPriority
        }
        addBatchFunc(batch, priority, listener)
      }
    })
  }
}

const addBatchAtomDependent = (
  batch: Batch,
  atom: AnyAtom,
  dependent: AnyAtom,
) => {
  const dependents = batch.D.get(atom)
  if (dependents) {
    dependents.add(dependent)
  }
}

const getBatchAtomDependents = (batch: Batch, atom: AnyAtom) =>
  batch.D.get(atom)

const flushBatch = (batch: Batch) => {
  let error: AnyError
  let hasError = false
  const call = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      if (!hasError) {
        error = e
        hasError = true
      }
    }
  }
  while (batch.H.size || batch.M.size || batch.L.size) {
    batch.D.clear()
    batch.H.forEach(call)
    batch.H.clear()
    batch.M.forEach(call)
    batch.M.clear()
    batch.L.forEach(call)
    batch.L.clear()
  }
  if (hasError) {
    throw error
  }
}

// internal & unstable type
type StoreArgs = readonly [
  getAtomState: <Value>(
    atom: Atom<Value>,
    atomOnInit: ReturnType<StoreArgs[4]>,
  ) => AtomState<Value>,
  atomRead: <Value>(
    atom: Atom<Value>,
    ...params: Parameters<Atom<Value>['read']>
  ) => Value,
  atomWrite: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...params: Parameters<WritableAtom<Value, Args, Result>['write']>
  ) => Result,
  atomOnMount: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    setAtom: (...args: Args) => Result,
  ) => OnUnmount | void,
  atomOnInit: (store: Store) => (atom: AnyAtom) => void,
]

// for debugging purpose only
type DevStoreRev4 = {
  dev4_get_internal_weak_map: () => {
    get: (atom: AnyAtom) => AtomState | undefined
  }
  dev4_get_mounted_atoms: () => Set<AnyAtom>
  dev4_restore_atoms: (values: Iterable<readonly [AnyAtom, AnyValue]>) => void
}

type PrdStore = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
  unstable_derive: (fn: (...args: StoreArgs) => StoreArgs) => Store
}

export type Store = PrdStore | (PrdStore & DevStoreRev4)

export type INTERNAL_DevStoreRev4 = DevStoreRev4
export type INTERNAL_PrdStore = PrdStore

const buildStore = (
  ...[baseGetAtomState, atomRead, atomWrite, atomOnMount, atomOnInit]: StoreArgs
): Store => {
  const getAtomState = <Value>(atom: Atom<Value>) =>
    baseGetAtomState(atom, atomOnInit(store))

  // for debugging purpose only
  let debugMountedAtoms: Set<AnyAtom>

  if (import.meta.env?.MODE !== 'production') {
    debugMountedAtoms = new Set()
  }

  const setAtomStateValueOrPromise = (
    atom: AnyAtom,
    atomState: AtomState,
    valueOrPromise: unknown,
  ) => {
    const hasPrevValue = 'v' in atomState
    const prevValue = atomState.v
    const pendingPromise = isPendingPromise(atomState.v) ? atomState.v : null
    if (isPromiseLike(valueOrPromise)) {
      patchPromiseForCancelability(valueOrPromise)
      for (const a of atomState.d.keys()) {
        addPendingPromiseToDependency(atom, valueOrPromise, getAtomState(a))
      }
      atomState.v = valueOrPromise
    } else {
      atomState.v = valueOrPromise
    }
    delete atomState.e
    delete atomState.x
    if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
      ++atomState.n
      if (pendingPromise) {
        cancelPromise(pendingPromise, valueOrPromise)
      }
    }
  }

  const readAtomState = <Value>(
    batch: Batch | undefined,
    atom: Atom<Value>,
  ): AtomState<Value> => {
    const atomState = getAtomState(atom)
    // See if we can skip recomputing this atom.
    if (isAtomStateInitialized(atomState)) {
      // If the atom is mounted, we can use cached atom state.
      // because it should have been updated by dependencies.
      // We can't use the cache if the atom is dirty.
      if (atomState.m && !atomState.x) {
        return atomState
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      if (
        Array.from(atomState.d).every(
          ([a, n]) =>
            // Recursively, read the atom state of the dependency, and
            // check if the atom epoch number is unchanged
            readAtomState(batch, a).n === n,
        )
      ) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    atomState.d.clear()
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = getAtomState(a)
        if (!isAtomStateInitialized(aState)) {
          if (hasInitialValue(a)) {
            setAtomStateValueOrPromise(a, aState, a.init)
          } else {
            // NOTE invalid derived atoms can reach here
            throw new Error('no atom init')
          }
        }
        return returnAtomValue(aState)
      }
      // a !== atom
      const aState = readAtomState(batch, a)
      try {
        return returnAtomValue(aState)
      } finally {
        if (isSync) {
          addDependency(batch, atom, atomState, a, aState)
        } else {
          const batch = createBatch()
          addDependency(batch, atom, atomState, a, aState)
          mountDependencies(batch, atom, atomState)
          flushBatch(batch)
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
              return writeAtom(atom, ...args)
            }
          }
        }
        return setSelf
      },
    }
    try {
      const valueOrPromise = atomRead(atom, getter, options as never)
      setAtomStateValueOrPromise(atom, atomState, valueOrPromise)
      if (isPromiseLike(valueOrPromise)) {
        valueOrPromise.onCancel?.(() => controller?.abort())
        const complete = () => {
          if (atomState.m) {
            const batch = createBatch()
            mountDependencies(batch, atom, atomState)
            flushBatch(batch)
          }
        }
        valueOrPromise.then(complete, complete)
      }
      return atomState
    } catch (error) {
      delete atomState.v
      atomState.e = error
      delete atomState.x
      ++atomState.n
      return atomState
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(undefined, atom))

  const getMountedOrBatchDependents = <Value>(
    batch: Batch,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Map<AnyAtom, AtomState> => {
    const dependents = new Map<AnyAtom, AtomState>()
    for (const a of atomState.m?.t || []) {
      const aState = getAtomState(a)
      if (aState.m) {
        dependents.set(a, aState)
      }
    }
    for (const atomWithPendingPromise of atomState.p) {
      dependents.set(
        atomWithPendingPromise,
        getAtomState(atomWithPendingPromise),
      )
    }
    getBatchAtomDependents(batch, atom)?.forEach((dependent) => {
      dependents.set(dependent, getAtomState(dependent))
    })
    return dependents
  }

  const recomputeDependents = <Value>(
    batch: Batch,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ) => {
    // Step 1: traverse the dependency graph to build the topsorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
    const topSortedReversed: [
      atom: AnyAtom,
      atomState: AtomState,
      epochNumber: number,
    ][] = []
    const visiting = new Set<AnyAtom>()
    const visited = new Set<AnyAtom>()
    // Visit the root atom. This is the only atom in the dependency graph
    // without incoming edges, which is one reason we can simplify the algorithm
    const stack: [a: AnyAtom, aState: AtomState][] = [[atom, atomState]]
    while (stack.length > 0) {
      const [a, aState] = stack[stack.length - 1]!
      if (visited.has(a)) {
        // All dependents have been processed, now process this atom
        stack.pop()
        continue
      }
      if (visiting.has(a)) {
        // The algorithm calls for pushing onto the front of the list. For
        // performance, we will simply push onto the end, and then will iterate in
        // reverse order later.
        topSortedReversed.push([a, aState, aState.n])
        // Atom has been visited but not yet processed
        visited.add(a)
        // Mark atom dirty
        aState.x = true
        stack.pop()
        continue
      }
      visiting.add(a)
      // Push unvisited dependents onto the stack
      for (const [d, s] of getMountedOrBatchDependents(batch, a, aState)) {
        if (a !== d && !visiting.has(d)) {
          stack.push([d, s])
        }
      }
    }

    // Step 2: use the topSortedReversed atom list to recompute all affected atoms
    // Track what's changed, so that we can short circuit when possible
    addBatchFunc(batch, 'H', () => {
      const changedAtoms = new Set<AnyAtom>([atom])
      for (let i = topSortedReversed.length - 1; i >= 0; --i) {
        const [a, aState, prevEpochNumber] = topSortedReversed[i]!
        let hasChangedDeps = false
        for (const dep of aState.d.keys()) {
          if (dep !== a && changedAtoms.has(dep)) {
            hasChangedDeps = true
            break
          }
        }
        if (hasChangedDeps) {
          readAtomState(batch, a)
          mountDependencies(batch, a, aState)
          if (prevEpochNumber !== aState.n) {
            registerBatchAtom(batch, a, aState)
            changedAtoms.add(a)
          }
        }
        delete aState.x
      }
    })
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    batch: Batch,
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) =>
      returnAtomValue(readAtomState(batch, a))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      const aState = getAtomState(a)
      try {
        if (isSelfAtom(atom, a)) {
          if (!hasInitialValue(a)) {
            // NOTE technically possible but restricted as it may cause bugs
            throw new Error('atom not writable')
          }
          const prevEpochNumber = aState.n
          const v = args[0] as V
          setAtomStateValueOrPromise(a, aState, v)
          mountDependencies(batch, a, aState)
          if (prevEpochNumber !== aState.n) {
            registerBatchAtom(batch, a, aState)
            recomputeDependents(batch, a, aState)
          }
          return undefined as R
        } else {
          return writeAtomState(batch, a, ...args)
        }
      } finally {
        if (!isSync) {
          flushBatch(batch)
        }
      }
    }
    try {
      return atomWrite(atom, getter, setter, ...args)
    } finally {
      isSync = false
    }
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const batch = createBatch()
    try {
      return writeAtomState(batch, atom, ...args)
    } finally {
      flushBatch(batch)
    }
  }

  const mountDependencies = (
    batch: Batch,
    atom: AnyAtom,
    atomState: AtomState,
  ) => {
    if (atomState.m && !isPendingPromise(atomState.v)) {
      for (const a of atomState.d.keys()) {
        if (!atomState.m.d.has(a)) {
          const aMounted = mountAtom(batch, a, getAtomState(a))
          aMounted.t.add(atom)
          atomState.m.d.add(a)
        }
      }
      for (const a of atomState.m.d || []) {
        if (!atomState.d.has(a)) {
          atomState.m.d.delete(a)
          const aMounted = unmountAtom(batch, a, getAtomState(a))
          aMounted?.t.delete(atom)
        }
      }
    }
  }

  const mountAtom = <Value>(
    batch: Batch,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Mounted => {
    if (!atomState.m) {
      // recompute atom state
      readAtomState(batch, atom)
      // mount dependencies first
      for (const a of atomState.d.keys()) {
        const aMounted = mountAtom(batch, a, getAtomState(a))
        aMounted.t.add(atom)
      }
      // mount self
      atomState.m = {
        l: new Set(),
        d: new Set(atomState.d.keys()),
        t: new Set(),
      }
      if (import.meta.env?.MODE !== 'production') {
        debugMountedAtoms.add(atom)
      }
      if (isActuallyWritableAtom(atom)) {
        const mounted = atomState.m
        let setAtom: (...args: unknown[]) => unknown
        const createInvocationContext = <T>(batch: Batch, fn: () => T) => {
          let isSync = true
          setAtom = (...args: unknown[]) => {
            try {
              return writeAtomState(batch, atom, ...args)
            } finally {
              if (!isSync) {
                flushBatch(batch)
              }
            }
          }
          try {
            return fn()
          } finally {
            isSync = false
          }
        }
        addBatchFunc(batch, 'L', () => {
          const onUnmount = createInvocationContext(batch, () =>
            atomOnMount(atom, (...args) => setAtom(...args)),
          )
          if (onUnmount) {
            mounted.u = (batch) => createInvocationContext(batch, onUnmount)
          }
        })
      }
    }
    return atomState.m
  }

  const unmountAtom = <Value>(
    batch: Batch,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Mounted | undefined => {
    if (
      atomState.m &&
      !atomState.m.l.size &&
      !Array.from(atomState.m.t).some((a) => getAtomState(a).m?.d.has(atom))
    ) {
      // unmount self
      const onUnmount = atomState.m.u
      if (onUnmount) {
        addBatchFunc(batch, 'L', () => onUnmount(batch))
      }
      delete atomState.m
      if (import.meta.env?.MODE !== 'production') {
        debugMountedAtoms.delete(atom)
      }
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        const aMounted = unmountAtom(batch, a, getAtomState(a))
        aMounted?.t.delete(atom)
      }
      return undefined
    }
    return atomState.m
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const batch = createBatch()
    const atomState = getAtomState(atom)
    const mounted = mountAtom(batch, atom, atomState)
    const listeners = mounted.l
    listeners.add(listener)
    flushBatch(batch)
    return () => {
      listeners.delete(listener)
      const batch = createBatch()
      unmountAtom(batch, atom, atomState)
      flushBatch(batch)
    }
  }

  const unstable_derive = (fn: (...args: StoreArgs) => StoreArgs) =>
    buildStore(
      ...fn(baseGetAtomState, atomRead, atomWrite, atomOnMount, atomOnInit),
    )

  const store: Store = {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom,
    unstable_derive,
  }
  if (import.meta.env?.MODE !== 'production') {
    const devStore: DevStoreRev4 = {
      // store dev methods (these are tentative and subject to change without notice)
      dev4_get_internal_weak_map: () => ({
        get: (atom) => {
          const atomState = getAtomState(atom)
          if (atomState.n === 0) {
            // for backward compatibility
            return undefined
          }
          return atomState
        },
      }),
      dev4_get_mounted_atoms: () => debugMountedAtoms,
      dev4_restore_atoms: (values) => {
        const batch = createBatch()
        for (const [atom, value] of values) {
          if (hasInitialValue(atom)) {
            const atomState = getAtomState(atom)
            const prevEpochNumber = atomState.n
            setAtomStateValueOrPromise(atom, atomState, value)
            mountDependencies(batch, atom, atomState)
            if (prevEpochNumber !== atomState.n) {
              registerBatchAtom(batch, atom, atomState)
              recomputeDependents(batch, atom, atomState)
            }
          }
        }
        flushBatch(batch)
      },
    }
    Object.assign(store, devStore)
  }
  return store
}

export const createStore = (): Store => {
  const atomStateMap = new WeakMap()
  const getAtomState: StoreArgs[0] = (atom, atomOnInit) => {
    if (import.meta.env?.MODE !== 'production' && !atom) {
      throw new Error('Atom is undefined or null')
    }
    let atomState = atomStateMap.get(atom) as AtomState<any> | undefined
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      atomStateMap.set(atom, atomState)
      atomOnInit(atom)
    }
    return atomState
  }
  return buildStore(
    getAtomState,
    (atom, ...params) => atom.read(...params),
    (atom, ...params) => atom.write(...params),
    (atom, ...params) => atom.onMount?.(...params),
    (store) => (atom) => atom.unstable_onInit?.(store),
  )
}

let defaultStore: Store | undefined

export const getDefaultStore = (): Store => {
  if (!defaultStore) {
    defaultStore = createStore()
    if (import.meta.env?.MODE !== 'production') {
      ;(globalThis as any).__JOTAI_DEFAULT_STORE__ ||= defaultStore
      if ((globalThis as any).__JOTAI_DEFAULT_STORE__ !== defaultStore) {
        console.warn(
          'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
        )
      }
    }
  }
  return defaultStore
}

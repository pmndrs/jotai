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

type CancelHandler = () => void
type PromiseState = [cancelHandlers: Set<CancelHandler>, settled: boolean]

const cancelablePromiseMap = new WeakMap<PromiseLike<unknown>, PromiseState>()

const isPromisePending = <T>(promise: PromiseLike<T>) =>
  !cancelablePromiseMap.get(promise)?.[1]

const cancelPromise = <T>(promise: PromiseLike<T>) => {
  const promiseState = cancelablePromiseMap.get(promise)
  if (promiseState) {
    promiseState[0].forEach((fn) => fn())
    promiseState[1] = true
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
    promiseState![1] = true
  }
  promise.then(settle, settle)
  ;(promise as { onCancel?: (fn: CancelHandler) => void }).onCancel = (fn) =>
    promiseState[0].add(fn)
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
  u?: OnUnmount
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

const getPendingPromise = (atomState: AtomState) => {
  const value: unknown = atomState.v
  if (isPromiseLike(value) && isPromisePending(value)) {
    return value
  }
  return null
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
  pending: Pending | undefined,
  atom: Atom<Value>,
  atomState: AtomState<Value>,
  a: AnyAtom,
  aState: AtomState,
) => {
  if (import.meta.env?.MODE !== 'production' && a === atom) {
    throw new Error('[Bug] atom cannot depend on itself')
  }
  atomState.d.set(a, aState.n)
  const cancelablePromise = getPendingPromise(atomState)
  if (cancelablePromise) {
    addPendingPromiseToDependency(atom, cancelablePromise, aState)
  }
  aState.m?.t.add(atom)
  if (pending) {
    addPendingDependent(pending, a, atom)
  }
}

//
// Pending
//

type Pending = readonly [
  dependents: Map<AnyAtom, Set<AnyAtom>>,
  atomStates: Map<AnyAtom, AtomState>,
  functions: Set<() => void>,
]

const createPending = (): Pending => [new Map(), new Map(), new Set()]

const addPendingAtom = (
  pending: Pending,
  atom: AnyAtom,
  atomState: AtomState,
) => {
  if (!pending[0].has(atom)) {
    pending[0].set(atom, new Set())
  }
  pending[1].set(atom, atomState)
}

const addPendingDependent = (
  pending: Pending,
  atom: AnyAtom,
  dependent: AnyAtom,
) => {
  const dependents = pending[0].get(atom)
  if (dependents) {
    dependents.add(dependent)
  }
}

const getPendingDependents = (pending: Pending, atom: AnyAtom) =>
  pending[0].get(atom)

const addPendingFunction = (pending: Pending, fn: () => void) => {
  pending[2].add(fn)
}

const flushPending = (pending: Pending) => {
  while (pending[1].size || pending[2].size) {
    pending[0].clear()
    const atomStates = new Set(pending[1].values())
    pending[1].clear()
    const functions = new Set(pending[2])
    pending[2].clear()
    atomStates.forEach((atomState) => atomState.m?.l.forEach((l) => l()))
    functions.forEach((fn) => fn())
  }
}

type GetAtomState = <Value>(
  atom: Atom<Value>,
  originAtomState?: AtomState,
) => AtomState<Value>

// internal & unstable type
type StoreArgs = readonly [
  getAtomState: GetAtomState,
  // possible other arguments in the future
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

type Store = PrdStore | (PrdStore & DevStoreRev4)

export type INTERNAL_DevStoreRev4 = DevStoreRev4
export type INTERNAL_PrdStore = PrdStore

const buildStore = (getAtomState: StoreArgs[0]): Store => {
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
    const pendingPromise = getPendingPromise(atomState)
    if (isPromiseLike(valueOrPromise)) {
      patchPromiseForCancelability(valueOrPromise)
      for (const a of atomState.d.keys()) {
        addPendingPromiseToDependency(
          atom,
          valueOrPromise,
          getAtomState(a, atomState),
        )
      }
      atomState.v = valueOrPromise
      delete atomState.e
    } else {
      atomState.v = valueOrPromise
      delete atomState.e
    }
    if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
      ++atomState.n
      if (pendingPromise) {
        cancelPromise(pendingPromise)
      }
    }
  }

  const readAtomState = <Value>(
    pending: Pending | undefined,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
    force?: (a: AnyAtom) => boolean,
  ): AtomState<Value> => {
    // See if we can skip recomputing this atom.
    if (!force?.(atom) && isAtomStateInitialized(atomState)) {
      // If the atom is mounted, we can use the cache.
      // because it should have been updated by dependencies.
      if (atomState.m) {
        return atomState
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      if (
        Array.from(atomState.d).every(
          ([a, n]) =>
            // Recursively, read the atom state of the dependency, and
            // check if the atom epoch number is unchanged
            readAtomState(pending, a, getAtomState(a, atomState), force).n ===
            n,
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
        const aState = getAtomState(a, atomState)
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
      const aState = readAtomState(
        pending,
        a,
        getAtomState(a, atomState),
        force,
      )
      if (isSync) {
        addDependency(pending, atom, atomState, a, aState)
      } else {
        const pending = createPending()
        addDependency(pending, atom, atomState, a, aState)
        mountDependencies(pending, atom, atomState)
        flushPending(pending)
      }
      return returnAtomValue(aState)
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
      const valueOrPromise = atom.read(getter, options as never)
      setAtomStateValueOrPromise(atom, atomState, valueOrPromise)
      if (isPromiseLike(valueOrPromise)) {
        valueOrPromise.onCancel?.(() => controller?.abort())
        const complete = () => {
          if (atomState.m) {
            const pending = createPending()
            mountDependencies(pending, atom, atomState)
            flushPending(pending)
          }
        }
        valueOrPromise.then(complete, complete)
      }
      return atomState
    } catch (error) {
      delete atomState.v
      atomState.e = error
      ++atomState.n
      return atomState
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(undefined, atom, getAtomState(atom)))

  const getDependents = <Value>(
    pending: Pending,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Map<AnyAtom, AtomState> => {
    const dependents = new Map<AnyAtom, AtomState>()
    for (const a of atomState.m?.t || []) {
      dependents.set(a, getAtomState(a, atomState))
    }
    for (const atomWithPendingPromise of atomState.p) {
      dependents.set(
        atomWithPendingPromise,
        getAtomState(atomWithPendingPromise, atomState),
      )
    }
    getPendingDependents(pending, atom)?.forEach((dependent) => {
      dependents.set(dependent, getAtomState(dependent, atomState))
    })
    return dependents
  }

  const recomputeDependents = <Value>(
    pending: Pending,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ) => {
    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search

    // Step 1: traverse the dependency graph to build the topsorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    const topsortedAtoms: (readonly [
      atom: AnyAtom,
      atomState: AtomState,
      epochNumber: number,
    ])[] = []
    const markedAtoms = new Set<AnyAtom>()
    const visit = (a: AnyAtom, aState: AtomState) => {
      if (markedAtoms.has(a)) {
        return
      }
      markedAtoms.add(a)
      for (const [d, s] of getDependents(pending, a, aState)) {
        if (a !== d) {
          visit(d, s)
        }
      }
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then will iterate in
      // reverse order later.
      topsortedAtoms.push([a, aState, aState.n])
    }
    // Visit the root atom. This is the only atom in the dependency graph
    // without incoming edges, which is one reason we can simplify the algorithm
    visit(atom, atomState)
    // Step 2: use the topsorted atom list to recompute all affected atoms
    // Track what's changed, so that we can short circuit when possible
    const changedAtoms = new Set<AnyAtom>([atom])
    const isMarked = (a: AnyAtom) => markedAtoms.has(a)
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const [a, aState, prevEpochNumber] = topsortedAtoms[i]!
      let hasChangedDeps = false
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        readAtomState(pending, a, aState, isMarked)
        mountDependencies(pending, a, aState)
        if (prevEpochNumber !== aState.n) {
          addPendingAtom(pending, a, aState)
          changedAtoms.add(a)
        }
      }
      markedAtoms.delete(a)
    }
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    pending: Pending,
    atom: WritableAtom<Value, Args, Result>,
    atomState: AtomState<Value>,
    ...args: Args
  ): Result => {
    const getter: Getter = <V>(a: Atom<V>) =>
      returnAtomValue(readAtomState(pending, a, getAtomState(a, atomState)))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      const aState = getAtomState(a, atomState)
      let r: R | undefined
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const hasPrevValue = 'v' in aState
        const prevValue = aState.v
        const v = args[0] as V
        setAtomStateValueOrPromise(a, aState, v)
        mountDependencies(pending, a, aState)
        if (!hasPrevValue || !Object.is(prevValue, aState.v)) {
          addPendingAtom(pending, a, aState)
          recomputeDependents(pending, a, aState)
        }
      } else {
        r = writeAtomState(pending, a, aState, ...args) as R
      }
      flushPending(pending)
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const pending = createPending()
    const result = writeAtomState(pending, atom, getAtomState(atom), ...args)
    flushPending(pending)
    return result
  }

  const mountDependencies = (
    pending: Pending,
    atom: AnyAtom,
    atomState: AtomState,
  ) => {
    if (atomState.m && !getPendingPromise(atomState)) {
      for (const a of atomState.d.keys()) {
        if (!atomState.m.d.has(a)) {
          const aMounted = mountAtom(pending, a, getAtomState(a, atomState))
          aMounted.t.add(atom)
          atomState.m.d.add(a)
        }
      }
      for (const a of atomState.m.d || []) {
        if (!atomState.d.has(a)) {
          atomState.m.d.delete(a)
          const aMounted = unmountAtom(pending, a, getAtomState(a, atomState))
          aMounted?.t.delete(atom)
        }
      }
    }
  }

  const mountAtom = <Value>(
    pending: Pending,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Mounted => {
    if (!atomState.m) {
      // recompute atom state
      readAtomState(pending, atom, atomState)
      // mount dependencies first
      for (const a of atomState.d.keys()) {
        const aMounted = mountAtom(pending, a, getAtomState(a, atomState))
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
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const mounted = atomState.m
        const { onMount } = atom
        addPendingFunction(pending, () => {
          const onUnmount = onMount((...args) =>
            writeAtomState(pending, atom, atomState, ...args),
          )
          if (onUnmount) {
            mounted.u = onUnmount
          }
        })
      }
    }
    return atomState.m
  }

  const unmountAtom = <Value>(
    pending: Pending,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): Mounted | undefined => {
    if (
      atomState.m &&
      !atomState.m.l.size &&
      !Array.from(atomState.m.t).some((a) =>
        getAtomState(a, atomState).m?.d.has(atom),
      )
    ) {
      // unmount self
      const onUnmount = atomState.m.u
      if (onUnmount) {
        addPendingFunction(pending, onUnmount)
      }
      delete atomState.m
      if (import.meta.env?.MODE !== 'production') {
        debugMountedAtoms.delete(atom)
      }
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        const aMounted = unmountAtom(pending, a, getAtomState(a, atomState))
        aMounted?.t.delete(atom)
      }
      return undefined
    }
    return atomState.m
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const pending = createPending()
    const atomState = getAtomState(atom)
    const mounted = mountAtom(pending, atom, atomState)
    flushPending(pending)
    const listeners = mounted.l
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      const pending = createPending()
      unmountAtom(pending, atom, atomState)
      flushPending(pending)
    }
  }

  const unstable_derive = (fn: (...args: StoreArgs) => StoreArgs) =>
    buildStore(...fn(getAtomState))

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
        const pending = createPending()
        for (const [atom, value] of values) {
          if (hasInitialValue(atom)) {
            const atomState = getAtomState(atom)
            const hasPrevValue = 'v' in atomState
            const prevValue = atomState.v
            setAtomStateValueOrPromise(atom, atomState, value)
            mountDependencies(pending, atom, atomState)
            if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
              addPendingAtom(pending, atom, atomState)
              recomputeDependents(pending, atom, atomState)
            }
          }
        }
        flushPending(pending)
      },
    }
    Object.assign(store, devStore)
  }
  return store
}

export const createStore = (): Store => {
  const atomStateMap = new WeakMap()
  const getAtomState = <Value>(atom: Atom<Value>) => {
    let atomState = atomStateMap.get(atom) as AtomState<Value> | undefined
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      atomStateMap.set(atom, atomState)
    }
    return atomState
  }
  return buildStore(getAtomState)
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

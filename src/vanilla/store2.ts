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
// Continuable Promise
//

const CONTINUE_PROMISE = Symbol(
  import.meta.env?.MODE !== 'production' ? 'CONTINUE_PROMISE' : '',
)

const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

type ContinuePromise<T> = (
  nextPromise: PromiseLike<T> | undefined,
  nextAbort: () => void,
) => void

type ContinuablePromise<T> = Promise<T> &
  (
    | { status: typeof PENDING }
    | { status: typeof FULFILLED; value?: T }
    | { status: typeof REJECTED; reason?: AnyError }
  ) & {
    [CONTINUE_PROMISE]: ContinuePromise<T>
  }

const isContinuablePromise = (
  promise: unknown,
): promise is ContinuablePromise<AnyValue> =>
  typeof promise === 'object' && promise !== null && CONTINUE_PROMISE in promise

const continuablePromiseMap: WeakMap<
  PromiseLike<AnyValue>,
  ContinuablePromise<AnyValue>
> = new WeakMap()

/**
 * Create a continuable promise from a regular promise.
 */
const createContinuablePromise = <T>(
  promise: PromiseLike<T>,
  abort: () => void,
  complete: () => void,
): ContinuablePromise<T> => {
  if (!continuablePromiseMap.has(promise)) {
    let continuePromise: ContinuePromise<T>
    const p: any = new Promise((resolve, reject) => {
      let curr = promise
      const onFulfilled = (me: PromiseLike<T>) => (v: T) => {
        if (curr === me) {
          p.status = FULFILLED
          p.value = v
          resolve(v)
          complete()
        }
      }
      const onRejected = (me: PromiseLike<T>) => (e: AnyError) => {
        if (curr === me) {
          p.status = REJECTED
          p.reason = e
          reject(e)
          complete()
        }
      }
      promise.then(onFulfilled(promise), onRejected(promise))
      continuePromise = (nextPromise, nextAbort) => {
        if (nextPromise) {
          continuablePromiseMap.set(nextPromise, p)
          curr = nextPromise
          nextPromise.then(onFulfilled(nextPromise), onRejected(nextPromise))
        }
        abort()
        abort = nextAbort
      }
    })
    p.status = PENDING
    p[CONTINUE_PROMISE] = continuePromise!
    continuablePromiseMap.set(promise, p)
  }
  return continuablePromiseMap.get(promise) as ContinuablePromise<T>
}

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
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

const getPendingContinuablePromise = (atomState: AtomState) => {
  const value: unknown = atomState.v
  if (isContinuablePromise(value) && value.status === PENDING) {
    return value
  }
  return null
}

const addPendingContinuablePromiseToDependency = (
  atom: AnyAtom,
  promise: ContinuablePromise<AnyValue> & { status: typeof PENDING },
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

//
// Pending Set
//

type PendingSet = Set<
  | readonly [atomState: AtomState, atom: AnyAtom, dependents: Set<AnyAtom>]
  | (() => void)
>

const flushPending = (pendingSet: PendingSet) => {
  while (pendingSet.size) {
    const copy = new Set(pendingSet)
    pendingSet.clear()
    copy.forEach((pending) => {
      if (typeof pending === 'function') {
        pending()
      } else {
        const [atomState] = pending
        if (atomState.m) {
          atomState.m.l.forEach((listener) => listener())
        }
      }
    })
  }
}

// for debugging purpose only
type DevStoreRev4 = {
  dev4_get_internal_weak_map: () => WeakMap<AnyAtom, AtomState>
  dev4_override_method: <K extends keyof PrdStore>(
    key: K,
    fn: PrdStore[K],
  ) => void
}

type PrdStore = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
}
type Store = PrdStore | (PrdStore & DevStoreRev4)

export type INTERNAL_DevStoreRev4 = DevStoreRev4
export type INTERNAL_PrdStore = PrdStore

export const createStore = (): Store => {
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()

  const getAtomState = <Value>(atom: Atom<Value>) => {
    let atomState = atomStateMap.get(atom) as AtomState<Value> | undefined
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      atomStateMap.set(atom, atomState)
    }
    return atomState
  }

  const setAtomStateValueOrPromise = (
    atom: AnyAtom,
    atomState: AtomState,
    valueOrPromise: unknown,
    abortPromise = () => {},
    completePromise = () => {},
  ) => {
    const hasPrevValue = 'v' in atomState
    const prevValue = atomState.v
    const pendingPromise = getPendingContinuablePromise(atomState)
    if (isPromiseLike(valueOrPromise)) {
      if (pendingPromise) {
        if (pendingPromise !== valueOrPromise) {
          pendingPromise[CONTINUE_PROMISE](valueOrPromise, abortPromise)
        }
      } else {
        const continuablePromise = createContinuablePromise(
          valueOrPromise,
          abortPromise,
          completePromise,
        )
        if (continuablePromise.status === PENDING) {
          for (const a of atomState.d.keys()) {
            const aState = getAtomState(a)
            addPendingContinuablePromiseToDependency(
              atom,
              continuablePromise,
              aState,
            )
          }
        }
        atomState.v = continuablePromise
        delete atomState.e
      }
    } else {
      if (pendingPromise) {
        pendingPromise[CONTINUE_PROMISE](
          Promise.resolve(valueOrPromise),
          abortPromise,
        )
      }
      atomState.v = valueOrPromise
      delete atomState.e
    }
    if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
      ++atomState.n
    }
  }
  const addDependency = <Value>(
    pendingSet: PendingSet | undefined,
    atom: Atom<Value>,
    a: AnyAtom,
    aState: AtomState,
  ) => {
    if (import.meta.env?.MODE !== 'production' && a === atom) {
      throw new Error('[Bug] atom cannot depend on itself')
    }
    const atomState = getAtomState(atom)
    atomState.d.set(a, aState.n)
    const continuablePromise = getPendingContinuablePromise(atomState)
    if (continuablePromise) {
      addPendingContinuablePromiseToDependency(atom, continuablePromise, aState)
    }
    aState.m?.t.add(atom)
    pendingSet?.forEach((pending) => {
      if (Array.isArray(pending) && pending[1] === a) {
        pending[2].add(atom)
      }
    })
  }

  const readAtomState = <Value>(
    pendingSet: PendingSet | undefined,
    atom: Atom<Value>,
    force?: true,
  ): AtomState<Value> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (!force && isAtomStateInitialized(atomState)) {
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
            readAtomState(pendingSet, a).n === n,
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
      const aState = readAtomState(pendingSet, a)
      if (isSync) {
        addDependency(pendingSet, atom, a, aState)
      } else {
        const pendingSet: PendingSet = new Set()
        addDependency(pendingSet, atom, a, aState)
        mountDependencies(pendingSet, atom, atomState)
        flushPending(pendingSet)
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
      setAtomStateValueOrPromise(
        atom,
        atomState,
        valueOrPromise,
        () => controller?.abort(),
        () => {
          if (atomState.m) {
            const pendingSet: PendingSet = new Set()
            mountDependencies(pendingSet, atom, atomState)
            flushPending(pendingSet)
          }
        },
      )
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
    returnAtomValue(readAtomState(undefined, atom))

  const recomputeDependents = (pendingSet: PendingSet, atom: AnyAtom) => {
    const getDependents = (a: AnyAtom): Set<AnyAtom> => {
      const aState = getAtomState(a)
      const dependents = new Set(aState.m?.t)
      for (const atomWithPendingContinuablePromise of aState.p) {
        dependents.add(atomWithPendingContinuablePromise)
      }
      pendingSet.forEach((pending) => {
        if (Array.isArray(pending) && pending[1] === a) {
          ;(pending[2] as Set<AnyAtom>).forEach((dependent) => {
            dependents.add(dependent)
          })
        }
      })
      return dependents
    }

    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search

    // Step 1: traverse the dependency graph to build the topsorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    const topsortedAtoms: AnyAtom[] = []
    const markedAtoms = new Set<AnyAtom>()
    const visit = (n: AnyAtom) => {
      if (markedAtoms.has(n)) {
        return
      }
      markedAtoms.add(n)
      for (const m of getDependents(n)) {
        // we shouldn't use isSelfAtom here.
        if (n !== m) {
          visit(m)
        }
      }
      // The algorithm calls for pushing onto the front of the list. For
      // performance, we will simply push onto the end, and then will iterate in
      // reverse order later.
      topsortedAtoms.push(n)
    }
    // Visit the root atom. This is the only atom in the dependency graph
    // without incoming edges, which is one reason we can simplify the algorithm
    visit(atom)
    // Step 2: use the topsorted atom list to recompute all affected atoms
    // Track what's changed, so that we can short circuit when possible
    const changedAtoms = new Set<AnyAtom>([atom])
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const a = topsortedAtoms[i]!
      const aState = getAtomState(a)
      const hasPrevValue = 'v' in aState
      const prevValue = aState.v
      let hasChangedDeps = false
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        readAtomState(pendingSet, a, true)
        mountDependencies(pendingSet, a, aState)
        if (!hasPrevValue || !Object.is(prevValue, aState.v)) {
          pendingSet.add([aState, a, new Set()])
          changedAtoms.add(a)
        }
      }
    }
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    pendingSet: PendingSet,
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const getter: Getter = <V>(a: Atom<V>) =>
      returnAtomValue(readAtomState(pendingSet, a))
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      let r: R | undefined
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const aState = getAtomState(a)
        const hasPrevValue = 'v' in aState
        const prevValue = aState.v
        const v = args[0] as V
        setAtomStateValueOrPromise(a, aState, v)
        mountDependencies(pendingSet, a, aState)
        if (!hasPrevValue || !Object.is(prevValue, aState.v)) {
          pendingSet.add([aState, a, new Set()])
          recomputeDependents(pendingSet, a)
        }
      } else {
        r = writeAtomState(pendingSet, a as AnyWritableAtom, ...args) as R
      }
      flushPending(pendingSet)
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const pendingSet: PendingSet = new Set()
    const result = writeAtomState(pendingSet, atom, ...args)
    flushPending(pendingSet)
    return result
  }

  const mountDependencies = (
    pendingSet: PendingSet,
    atom: AnyAtom,
    atomState: AtomState,
  ) => {
    if (atomState.m && !getPendingContinuablePromise(atomState)) {
      for (const a of atomState.d.keys()) {
        if (!atomState.m.d.has(a)) {
          const aMounted = mountAtom(pendingSet, a)
          aMounted.t.add(atom)
          atomState.m.d.add(a)
        }
      }
      for (const a of atomState.m.d || []) {
        if (!atomState.d.has(a)) {
          const aMounted = unmountAtom(pendingSet, a)
          aMounted?.t.delete(atom)
          atomState.m.d.delete(a)
        }
      }
    }
  }

  const mountAtom = (pendingSet: PendingSet, atom: AnyAtom): Mounted => {
    const atomState = getAtomState(atom)
    if (!atomState.m) {
      // recompute atom state
      readAtomState(pendingSet, atom)
      // mount dependencies first
      for (const a of atomState.d.keys()) {
        const aMounted = mountAtom(pendingSet, a)
        aMounted.t.add(atom)
      }
      // mount self
      atomState.m = {
        l: new Set(),
        d: new Set(atomState.d.keys()),
        t: new Set(),
      }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const mounted = atomState.m
        const { onMount } = atom
        pendingSet.add(() => {
          const onUnmount = onMount((...args) =>
            writeAtomState(pendingSet, atom, ...args),
          )
          if (onUnmount) {
            mounted.u = onUnmount
          }
        })
      }
    }
    return atomState.m
  }

  const unmountAtom = (
    pendingSet: PendingSet,
    atom: AnyAtom,
  ): Mounted | undefined => {
    const atomState = getAtomState(atom)
    if (
      atomState.m &&
      !atomState.m.l.size &&
      !Array.from(atomState.m.t).some((a) => getAtomState(a).m)
    ) {
      // unmount self
      const onUnmount = atomState.m.u
      if (onUnmount) {
        pendingSet.add(onUnmount)
      }
      delete atomState.m
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        const aMounted = unmountAtom(pendingSet, a)
        aMounted?.t.delete(atom)
      }
      // abort pending promise
      const pendingPromise = getPendingContinuablePromise(atomState)
      if (pendingPromise) {
        // FIXME using `undefined` is kind of a hack.
        pendingPromise[CONTINUE_PROMISE](undefined, () => {})
      }
      return undefined
    }
    return atomState.m
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const pendingSet: PendingSet = new Set()
    const mounted = mountAtom(pendingSet, atom)
    flushPending(pendingSet)
    const listeners = mounted.l
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      const pendingSet: PendingSet = new Set()
      unmountAtom(pendingSet, atom)
      flushPending(pendingSet)
    }
  }

  if (import.meta.env?.MODE !== 'production') {
    const store: Store = {
      get: readAtom,
      set: writeAtom,
      sub: subscribeAtom,
      // store dev methods (these are tentative and subject to change without notice)
      dev4_get_internal_weak_map: () => atomStateMap,
      dev4_override_method: (key, fn) => {
        ;(store as any)[key] = fn
      },
    }
    return store
  }
  return {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom,
  }
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

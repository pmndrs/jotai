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
// Pending Set
//

type PendingPair = [
  // TODO We should probably separate queues to notify and (un)mount
  pendingForSync: Set<readonly [AnyAtom, AtomState] | (() => void)> | undefined,
  pendingForAsync: Set<readonly [AnyAtom, AtomState] | (() => void)>,
]

const createPendingPair = (): PendingPair => [new Set(), new Set()]

const addPending = (
  pendingPair: PendingPair,
  pending: readonly [AnyAtom, AtomState] | (() => void),
) => {
  ;(pendingPair[0] || pendingPair[1]).add(pending)
}

const flushPending = (pendingPair: PendingPair, isAsync?: true) => {
  let pendingSet: Set<readonly [AnyAtom, AtomState] | (() => void)>
  if (isAsync) {
    if (pendingPair[0]) {
      // sync flush hasn't been called yet
      return
    }
    pendingSet = pendingPair[1]
  } else {
    if (!pendingPair[0]) {
      throw new Error('[Bug] cannot sync flush twice')
    }
    pendingSet = pendingPair[0]
  }
  const flushed = new Set<AnyAtom>()
  while (pendingSet.size) {
    const copy = new Set(pendingSet)
    pendingSet.clear()
    copy.forEach((pending) => {
      if (typeof pending === 'function') {
        pending()
      } else {
        const [atom, atomState] = pending
        if (!flushed.has(atom)) {
          if (atomState.m && atomState.m.l.size) {
            atomState.m.l.forEach((listener) => listener())
          } else {
            atomState.u = true
          }
          flushed.add(atom)
        }
      }
    })
  }
  pendingPair[0] = undefined
  return flushed
}

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

const getPendingContinuablePromise = (atomState: AtomState) => {
  const value: unknown = (atomState as any).s?.v
  if (isContinuablePromise(value) && value.status === PENDING) {
    return value
  }
  return null
}

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
   * The map value is value/error of the dependency.
   */
  readonly d: Map<AnyAtom, { readonly v: AnyValue } | { readonly e: AnyError }>
  /** Set of atoms that depends on the atom. */
  readonly t: Set<AnyAtom>
  /** Object to store mounted state of the atom. */
  m?: Mounted // only available if the atom is mounted
  /** Atom value, atom error or empty. */
  s?: { readonly v: Value } | { readonly e: AnyError }
  /** should update */
  u?: boolean // only if the atom is unmounted but has been written state, the value is true.
}

type WithS<T extends AtomState> = T & { s: NonNullable<T['s']> }

const returnAtomValue = <Value>(atomState: WithS<AtomState<Value>>): Value => {
  if ('e' in atomState.s) {
    throw atomState.s.e
  }
  return atomState.s.v
}

const setAtomStateValueOrPromise = (
  atomState: AtomState,
  valueOrPromise: unknown,
  abortPromise = () => {},
  completePromise = () => {},
) => {
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
      atomState.s = { v: continuablePromise }
    }
  } else {
    if (pendingPromise) {
      pendingPromise[CONTINUE_PROMISE](
        Promise.resolve(valueOrPromise),
        abortPromise,
      )
    }
    atomState.s = { v: valueOrPromise }
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
      atomState = { d: new Map(), t: new Set() }
      atomStateMap.set(atom, atomState)
    }
    return atomState
  }

  const clearDependencies = <Value>(atom: Atom<Value>) => {
    const atomState = getAtomState(atom)
    for (const a of atomState.d.keys()) {
      getAtomState(a).t.delete(atom)
    }
    atomState.d.clear()
  }

  const addDependency = <Value>(
    atom: Atom<Value>,
    a: AnyAtom,
    aState: WithS<AtomState>,
    isSync: boolean,
  ) => {
    if (import.meta.env?.MODE !== 'production' && a === atom) {
      throw new Error('[Bug] atom cannot depend on itself')
    }
    const atomState = getAtomState(atom)
    atomState.d.set(a, aState.s)
    aState.t.add(atom)
    if (!isSync && atomState.m) {
      const pendingPair = createPendingPair()
      mountDependencies(pendingPair, atomState)
      flushPending(pendingPair)
    }
  }

  const readAtomState = <Value>(
    atom: Atom<Value>,
    force?: true,
  ): WithS<AtomState<Value>> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (!force && 's' in atomState) {
      // If the atom is mounted, we can use the cache.
      // because it should have been updated by dependencies.
      if (atomState.m) {
        return atomState as WithS<typeof atomState>
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      if (
        Array.from(atomState.d).every(([a, s]) => {
          // Recursively, read the atom state of the dependency, and
          const aState = readAtomState(a)
          // Check if the atom value is unchanged
          return 'v' in s && 'v' in aState.s && Object.is(s.v, aState.s.v)
        })
      ) {
        return atomState as WithS<typeof atomState>
      }
    }
    // Compute a new state for this atom.
    clearDependencies(atom)
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = getAtomState(a)
        if (!aState.s) {
          if (hasInitialValue(a)) {
            setAtomStateValueOrPromise(aState, a.init)
          } else {
            // NOTE invalid derived atoms can reach here
            throw new Error('no atom init')
          }
        }
        return returnAtomValue(aState as WithS<typeof aState>)
      }
      // a !== atom
      const aState = readAtomState(a)
      addDependency(atom, a, aState, isSync)
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
        atomState,
        valueOrPromise,
        () => controller?.abort(),
        () => {
          if (atomState.m) {
            const pendingPair = createPendingPair()
            mountDependencies(pendingPair, atomState)
            flushPending(pendingPair)
          }
        },
      )
      return atomState as WithS<typeof atomState>
    } catch (error) {
      atomState.s = { e: error }
      return atomState as WithS<typeof atomState>
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(atom))

  const recomputeDependents = (pendingPair: PendingPair, atom: AnyAtom) => {
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
      for (const m of getAtomState(n).t) {
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
    const originalAtomState = getAtomState(atom)
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const a = topsortedAtoms[i]!
      const aState = getAtomState(a)
      const prev = aState.s
      let hasChangedDeps = false
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          aState.u = originalAtomState.u || false
          break
        }
      }
      if (hasChangedDeps) {
        // only recompute if it is mounted or it has a pending promise
        if (aState.u || aState.m || getPendingContinuablePromise(aState)) {
          readAtomState(a, true)
          mountDependencies(pendingPair, aState)
          if (
            !prev ||
            !('v' in prev) ||
            !('v' in aState.s!) ||
            !Object.is(prev.v, aState.s.v)
          ) {
            addPending(pendingPair, [a, aState])
            changedAtoms.add(a)
          }
        }
      }
    }
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    pendingPair: PendingPair,
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const getter: Getter = <V>(a: Atom<V>) => returnAtomValue(readAtomState(a))
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
        const prev = aState.s
        const v = args[0] as V
        setAtomStateValueOrPromise(aState, v)
        mountDependencies(pendingPair, aState)
        const curr = (aState as WithS<typeof aState>).s
        if (
          !prev ||
          !('v' in prev) ||
          !('v' in curr) ||
          !Object.is(prev.v, curr.v)
        ) {
          addPending(pendingPair, [a, aState])
          recomputeDependents(pendingPair, a)
        }
      } else {
        r = writeAtomState(pendingPair, a as AnyWritableAtom, ...args) as R
      }
      flushPending(pendingPair, true)
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const pendingPair = createPendingPair()
    const result = writeAtomState(pendingPair, atom, ...args)
    flushPending(pendingPair)
    return result
  }

  const mountDependencies = (
    pendingPair: PendingPair,
    atomState: AtomState,
  ) => {
    if (atomState.m && !getPendingContinuablePromise(atomState)) {
      for (const a of atomState.d.keys()) {
        if (!atomState.m.d.has(a)) {
          mountAtom(pendingPair, a)
          atomState.m.d.add(a)
        }
      }
      for (const a of atomState.m.d || []) {
        if (!atomState.d.has(a)) {
          unmountAtom(pendingPair, a)
          atomState.m.d.delete(a)
        }
      }
    }
  }

  const mountAtom = (pendingPair: PendingPair, atom: AnyAtom): Mounted => {
    const atomState = getAtomState(atom)
    if (!atomState.m) {
      // recompute atom state
      readAtomState(atom)
      // mount dependents first
      for (const a of atomState.d.keys()) {
        mountAtom(pendingPair, a)
      }
      // mount self
      atomState.m = { l: new Set(), d: new Set(atomState.d.keys()) }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const mounted = atomState.m
        const { onMount } = atom
        addPending(pendingPair, () => {
          const onUnmount = onMount((...args) => {
            atomState.u = true
            return writeAtomState(pendingPair, atom, ...args)
          })
          if (onUnmount) {
            mounted.u = onUnmount
          }
        })
      }
    }
    return atomState.m
  }

  const unmountAtom = (pendingPair: PendingPair, atom: AnyAtom) => {
    const atomState = getAtomState(atom)
    if (
      atomState.m &&
      !atomState.m.l.size &&
      !Array.from(atomState.t).some((a) => getAtomState(a).m)
    ) {
      // unmount self
      const onUnmount = atomState.m.u
      if (onUnmount) {
        addPending(pendingPair, onUnmount)
      }
      delete atomState.m
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        unmountAtom(pendingPair, a)
      }
      // abort pending promise
      const pendingPromise = getPendingContinuablePromise(atomState)
      if (pendingPromise) {
        // FIXME using `undefined` is kind of a hack.
        pendingPromise[CONTINUE_PROMISE](undefined, () => {})
      }
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const pendingPair = createPendingPair()
    const mounted = mountAtom(pendingPair, atom)
    flushPending(pendingPair)
    const listeners = mounted.l
    listeners.add(listener)
    const atomState = getAtomState(atom)
    if (atomState.u) {
      listener()
      atomState.u = false
    }
    return () => {
      listeners.delete(listener)
      const pendingPair = createPendingPair()
      unmountAtom(pendingPair, atom)
      flushPending(pendingPair)
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

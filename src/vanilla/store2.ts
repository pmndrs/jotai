import type { Atom, WritableAtom } from './atom.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]

const isSelfAtom = (atom: AnyAtom, a: AnyAtom) =>
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

type PendingSet = [
  Set<readonly [AnyAtom, AtomState] | (() => void)>,
  done: boolean,
]

const createPendingSet = (): PendingSet => [new Set(), false]

const addPendingSet = (
  pendingSet: PendingSet,
  pending: readonly [AnyAtom, AtomState] | (() => void),
) => {
  pendingSet[0].add(pending)
}

const flushPendingSet = (pendingSet: PendingSet, redo?: boolean) => {
  if (redo && !pendingSet[1]) {
    return
  }
  const flushed = new Set<AnyAtom>()
  pendingSet[0].forEach((pending) => {
    if (typeof pending === 'function') {
      pending()
    } else {
      const [atom, atomState] = pending
      if (!flushed.has(atom) && atomState.m) {
        atomState.m.l.forEach((listener) => listener())
        flushed.add(atom)
      }
    }
  })
  pendingSet[0].clear()
  pendingSet[1] = true
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
  nextPromise: PromiseLike<T>,
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
  !!promise && CONTINUE_PROMISE in (promise as object)

const continuablePromiseMap = new WeakMap<
  PromiseLike<AnyValue>,
  ContinuablePromise<AnyValue>
>()

/**
 * Create a continuable promise from a regular promise.
 */
const createContinuablePromise = <T>(
  promise: PromiseLike<T>,
  abort: () => void,
): ContinuablePromise<T> => {
  if (!continuablePromiseMap.has(promise)) {
    let continuePromise: ContinuePromise<T>
    const p: any = new Promise((resolve, reject) => {
      let curr = promise
      const onFullfilled = (me: PromiseLike<T>) => (v: T) => {
        if (curr === me) {
          p.status = FULFILLED
          p.value = v
          resolve(v)
        }
      }
      const onRejected = (me: PromiseLike<T>) => (e: AnyError) => {
        if (curr === me) {
          p.status = REJECTED
          p.reason = e
          reject(e)
        }
      }
      promise.then(onFullfilled(promise), onRejected(promise))
      continuePromise = (nextPromise, nextAbort) => {
        continuablePromiseMap.set(nextPromise, p)
        curr = nextPromise
        nextPromise.then(onFullfilled(nextPromise), onRejected(nextPromise))
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
}

type WithS<T extends AtomState> = T & { s: NonNullable<T['s']> }

const returnAtomValue = <Value>(atomState: WithS<AtomState<Value>>): Value => {
  if ('e' in atomState.s) {
    throw atomState.s.e
  }
  return atomState.s.v
}

const setAtomStatePromise = (
  atomState: AtomState,
  promise: PromiseLike<unknown>,
  abort = () => {},
  complete = () => {},
) => {
  const prev: unknown = (atomState as any).s?.v
  if (isContinuablePromise(prev) && prev.status === PENDING) {
    prev[CONTINUE_PROMISE](promise, abort)
  } else {
    const continuablePromise = createContinuablePromise(promise, abort)
    atomState.s = { v: continuablePromise }
    continuablePromise.finally(complete)
  }
}

// for debugging purpose only
type StoreListenerRev2 = (
  action:
    | { type: 'write'; flushed: Set<AnyAtom> }
    | { type: 'async-write'; flushed: Set<AnyAtom> }
    | { type: 'sub'; flushed: Set<AnyAtom> }
    | { type: 'unsub' }
    | { type: 'restore'; flushed: Set<AnyAtom> },
) => void

type OldAtomState = { d: Map<AnyAtom, OldAtomState> } & (
  | { e: AnyError }
  | { v: AnyValue }
)
type OldMounted = { l: Set<() => void>; t: Set<AnyAtom>; u?: OnUnmount }

export type Store = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
  dev_subscribe_store?: (l: StoreListenerRev2, rev: 2) => () => void
  dev_get_mounted_atoms?: () => IterableIterator<AnyAtom>
  dev_get_atom_state?: (a: AnyAtom) => OldAtomState | undefined
  dev_get_mounted?: (a: AnyAtom) => OldMounted | undefined
  dev_restore_atoms?: (values: Iterable<readonly [AnyAtom, AnyValue]>) => void
}

export const createStore = (): Store => {
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()

  const getAtomState = <Value>(atom: Atom<Value>) => {
    if (!atomStateMap.has(atom)) {
      const atomState: AtomState<Value> = { d: new Map(), t: new Set() }
      atomStateMap.set(atom, atomState)
    }
    return atomStateMap.get(atom) as AtomState<Value>
  }

  let storeListenersRev2: Set<StoreListenerRev2>
  let mountedAtoms: Set<AnyAtom>
  if (import.meta.env?.MODE !== 'production') {
    storeListenersRev2 = new Set()
    mountedAtoms = new Set()
  }

  const clearDependencies = <Value>(atom: Atom<Value>) => {
    const atomState = getAtomState(atom)
    const prevDeps = new Set(atomState.d.keys())
    for (const a of atomState.d.keys()) {
      getAtomState(a).t.delete(atom)
    }
    atomState.d.clear()
    return prevDeps
  }

  const addDependency = <Value>(
    pendingSet: PendingSet | undefined,
    atom: Atom<Value>,
    a: AnyAtom,
    aState: WithS<AtomState>,
  ) => {
    if (import.meta.env?.MODE !== 'production' && a === atom) {
      throw new Error('[Bug] atom cannot depend on itself')
    }
    const atomState = getAtomState(atom)
    atomState.d.set(a, aState.s)
    aState.t.add(atom)
    if (pendingSet && atomState.m) {
      mountAtom(pendingSet, a)
    }
  }

  const mountDependencies = (
    pendingSet: PendingSet | undefined,
    atomState: AtomState,
    prevDeps: Set<AnyAtom>,
  ) => {
    if (pendingSet && atomState.m) {
      for (const a of prevDeps) {
        if (!atomState.d.has(a)) {
          unmountAtom(pendingSet!, a)
        }
      }
      for (const a of atomState.d.keys()) {
        if (!prevDeps.has(a)) {
          mountAtom(pendingSet!, a)
        }
      }
      const flushed = flushPendingSet(pendingSet, true)
      if (import.meta.env?.MODE !== 'production' && flushed) {
        // storeListenersRev2.forEach((l) => l({ type: 'async-mount', flushed }))
      }
    }
  }

  const readAtomState = <Value>(
    pendingSet: PendingSet | undefined,
    atom: Atom<Value>,
    force?: boolean,
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
          const aState = readAtomState(pendingSet, a)
          // Check if the atom value is unchanged
          return 'v' in s && 'v' in aState.s && Object.is(s.v, aState.s.v)
        })
      ) {
        return atomState as WithS<typeof atomState>
      }
    }
    // Compute a new state for this atom.
    const prevDeps = clearDependencies(atom)
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
        const aState = getAtomState(a)
        if (!aState.s) {
          if (hasInitialValue(a)) {
            aState.s = { v: a.init as V }
          } else {
            // NOTE invalid derived atoms can reach here
            throw new Error('no atom init')
          }
        }
        return returnAtomValue(aState as WithS<typeof aState>)
      }
      // a !== atom
      if (!isSync) {
        pendingSet = createPendingSet()
      }
      const aState = readAtomState(pendingSet, a)
      addDependency(pendingSet, atom, a, aState)
      if (!isSync) {
        flushPendingSet(pendingSet!)
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
      const valueOrPromise = atom.read(getter, options as any)
      if (isPromiseLike(valueOrPromise)) {
        setAtomStatePromise(
          atomState,
          valueOrPromise,
          () => controller?.abort(),
          () => {
            const pendingSet = createPendingSet()
            mountDependencies(pendingSet, atomState, prevDeps)
            flushPendingSet(pendingSet)
          },
        )
      } else {
        atomState.s = { v: valueOrPromise }
        mountDependencies(pendingSet, atomState, prevDeps)
      }
      return atomState as WithS<typeof atomState>
    } catch (error) {
      atomState.s = { e: error }
      mountDependencies(pendingSet, atomState, prevDeps)
      return atomState as WithS<typeof atomState>
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(undefined, atom))

  const recomputeDependents = (pendingSet: PendingSet, atom: AnyAtom) => {
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
    for (let i = topsortedAtoms.length - 1; i >= 0; --i) {
      const a = topsortedAtoms[i]!
      const aState = getAtomState(a)
      const prev = aState.s
      let hasChangedDeps = false
      for (const dep of aState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        // only recompute if it is mounted
        if (aState.m) {
          readAtomState(pendingSet, a, true)
          if (
            !prev ||
            !('v' in prev) ||
            !('v' in aState.s!) ||
            !Object.is(prev.v, aState.s.v)
          ) {
            addPendingSet(pendingSet, [a, aState])
            changedAtoms.add(a)
          }
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
        const prev = aState.s
        const v = args[0] as V
        if (isPromiseLike(v)) {
          setAtomStatePromise(aState, v)
        } else {
          aState.s = { v }
        }
        const curr = (aState as WithS<typeof aState>).s
        if (
          !prev ||
          !('v' in prev) ||
          !('v' in curr) ||
          !Object.is(prev.v, curr.v)
        ) {
          addPendingSet(pendingSet, [a, aState])
          recomputeDependents(pendingSet, a)
        }
      } else {
        r = writeAtomState(pendingSet, a as AnyWritableAtom, ...args) as R
      }
      const flushed = flushPendingSet(pendingSet, true)
      if (import.meta.env?.MODE !== 'production' && flushed) {
        storeListenersRev2.forEach((l) => l({ type: 'async-write', flushed }))
      }
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const pendingSet = createPendingSet()
    const result = writeAtomState(pendingSet, atom, ...args)
    const flushed = flushPendingSet(pendingSet)
    if (import.meta.env?.MODE !== 'production') {
      storeListenersRev2.forEach((l) => l({ type: 'write', flushed: flushed! }))
    }
    return result
  }

  const mountAtom = (pendingSet: PendingSet, atom: AnyAtom): Mounted => {
    const atomState = getAtomState(atom)
    if (!atomState.m) {
      // recompute atom state
      readAtomState(pendingSet, atom)
      // mount dependents first
      for (const a of atomState.d.keys()) {
        mountAtom(pendingSet, a)
      }
      // mount self
      atomState.m = { l: new Set() }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const mounted = atomState.m
        const { onMount } = atom
        addPendingSet(pendingSet, () => {
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

  const unmountAtom = (pendingSet: PendingSet, atom: AnyAtom) => {
    const atomState = getAtomState(atom)
    if (atomState.m && !atomState.m.l.size && !atomState.t.size) {
      // unmount self
      const onUnmount = atomState.m.u
      if (onUnmount) {
        addPendingSet(pendingSet, onUnmount)
      }
      delete atomState.m
      // unmount dependencies
      for (const a of atomState.d.keys()) {
        unmountAtom(pendingSet, a)
      }
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const pendingSet = createPendingSet()
    const mounted = mountAtom(pendingSet, atom)
    const flushed = flushPendingSet(pendingSet)
    const listeners = mounted.l
    listeners.add(listener)
    if (import.meta.env?.MODE !== 'production') {
      storeListenersRev2.forEach((l) => l({ type: 'sub', flushed: flushed! }))
    }
    return () => {
      listeners.delete(listener)
      const pendingSet = createPendingSet()
      unmountAtom(pendingSet, atom)
      flushPendingSet(pendingSet)
      if (import.meta.env?.MODE !== 'production') {
        // devtools uses this to detect if it _can_ unmount or not
        storeListenersRev2.forEach((l) => l({ type: 'unsub' }))
      }
    }
  }

  if (import.meta.env?.MODE !== 'production') {
    return {
      get: readAtom,
      set: writeAtom,
      sub: subscribeAtom,
      // store dev methods (these are tentative and subject to change without notice)
      dev_subscribe_store: (l: StoreListenerRev2, rev: 2) => {
        if (rev !== 2) {
          throw new Error('The current StoreListener revision is 2.')
        }
        storeListenersRev2.add(l as StoreListenerRev2)
        return () => {
          storeListenersRev2.delete(l as StoreListenerRev2)
        }
      },
      dev_get_mounted_atoms: () => mountedAtoms.values(),
      dev_get_atom_state: (a: AnyAtom) => {
        const getOldAtomState = (a: AnyAtom): OldAtomState | undefined => {
          const aState = atomStateMap.get(a)
          return (
            aState &&
            aState.s && {
              d: new Map<AnyAtom, OldAtomState>(
                Array.from(aState.d.keys()).flatMap((a) => {
                  const s = getOldAtomState(a)
                  return s ? [[a, s]] : []
                }),
              ),
              ...aState.s,
            }
          )
        }
        return getOldAtomState(a)
      },
      dev_get_mounted: (a: AnyAtom) => {
        const aState = atomStateMap.get(a)
        return aState && aState.m && { t: aState.t, ...aState.m }
      },
      dev_restore_atoms: (values: Iterable<readonly [AnyAtom, AnyValue]>) => {
        const pendingSet = createPendingSet()
        for (const [atom, value] of values) {
          getAtomState(atom).s = { v: value }
          recomputeDependents(pendingSet, atom)
        }
        const flushed = flushPendingSet(pendingSet)
        storeListenersRev2.forEach((l) =>
          l({ type: 'restore', flushed: flushed! }),
        )
      },
    }
  }
  return {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom,
  }
}

let defaultStore: Store | undefined

if (import.meta.env?.MODE !== 'production') {
  if (typeof (globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ === 'number') {
    ++(globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__
  } else {
    ;(globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ = 1
  }
}

export const getDefaultStore = () => {
  if (!defaultStore) {
    if (
      import.meta.env?.MODE !== 'production' &&
      (globalThis as any).__NUMBER_OF_JOTAI_INSTANCES__ !== 1
    ) {
      console.warn(
        'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
      )
    }
    defaultStore = createStore()
  }
  return defaultStore
}

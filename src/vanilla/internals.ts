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

export type INTERNAL_AtomState<Value = AnyValue> = AtomState<Value>

//
// Some util functions
//

// TODO this will be gone soon
const isSelfAtom = (atom: AnyAtom, a: AnyAtom): boolean =>
  atom.unstable_is ? atom.unstable_is(a) : a === atom

const hasInitialValue = <T extends Atom<AnyValue>>(
  atom: T,
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

const isAtomStateInitialized = <Value>(atomState: AtomState<Value>): boolean =>
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

//
// Cancelable Promise
// TODO(daishi): revisit this implementation
//

type CancelHandler = (nextValue: unknown) => void
type PromiseState = [cancelHandlers: Set<CancelHandler>, settled: boolean]

const PROMISE_STATE = Symbol.for('jotai.unstable.promise.state')

const isPendingPromise = (value: unknown): value is PromiseLike<unknown> =>
  isPromiseLike(value) && !(value as any)[PROMISE_STATE]?.[1]

const cancelPromise = <T>(
  promise: PromiseLike<T>,
  nextValue: unknown,
): void => {
  const promiseState = (promise as any)[PROMISE_STATE] as
    | PromiseState
    | undefined
  if (promiseState) {
    promiseState[1] = true
    promiseState[0].forEach((fn) => fn(nextValue))
  } else if (import.meta.env?.MODE !== 'production') {
    throw new Error('[Bug] cancelable promise not found')
  }
}

const patchPromiseForCancelability = <T>(promise: PromiseLike<T>): void => {
  if ((promise as any)[PROMISE_STATE]) {
    // already patched
    return
  }
  const promiseState: PromiseState = [new Set(), false]
  ;(promise as any)[PROMISE_STATE] = promiseState
  const settle = () => {
    promiseState[1] = true
  }
  promise.then(settle, settle)
  ;(promise as { onCancel?: (fn: CancelHandler) => void }).onCancel = (fn) => {
    promiseState[0].add(fn)
  }
}

const isPromiseLike = (
  p: unknown,
): p is PromiseLike<unknown> & { onCancel?: (fn: CancelHandler) => void } =>
  typeof (p as any)?.then === 'function'

const addPendingPromiseToDependency = (
  atom: AnyAtom,
  promise: PromiseLike<AnyValue>,
  dependencyAtomState: AtomState,
): void => {
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
// Some building-block functions
//

const flushCallbacks = (storeState: StoreState): void => {
  const [
    ,
    storeHooks,
    ,
    mountedAtoms,
    ,
    changedAtoms,
    mountCallbacks,
    unmountCallbacks,
  ] = storeState
  let hasError: true | undefined
  let error: unknown | undefined
  const call = (fn: () => void) => {
    try {
      fn()
    } catch (e) {
      if (!hasError) {
        hasError = true
        error = e
      }
    }
  }
  do {
    if (storeHooks.f) {
      call(storeHooks.f)
    }
    const callbacks = new Set<() => void>()
    const add = callbacks.add.bind(callbacks)
    changedAtoms.forEach((_, atom) => mountedAtoms.get(atom)?.l.forEach(add))
    changedAtoms.clear()
    unmountCallbacks.forEach(add)
    unmountCallbacks.clear()
    mountCallbacks.forEach(add)
    mountCallbacks.clear()
    callbacks.forEach(call)
    if (changedAtoms.size) {
      recomputeInvalidatedAtoms(storeState)
    }
  } while (changedAtoms.size || unmountCallbacks.size || mountCallbacks.size)
  if (hasError) {
    throw error
  }
}

const recomputeInvalidatedAtoms = (storeState: StoreState): void => {
  const [, storeHooks, ensureAtomState, , invalidatedAtoms, changedAtoms] =
    storeState
  // Step 1: traverse the dependency graph to build the topsorted atom list
  // We don't bother to check for cycles, which simplifies the algorithm.
  // This is a topological sort via depth-first search, slightly modified from
  // what's described here for simplicity and performance reasons:
  // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
  const topSortedReversed: [
    atom: AnyAtom,
    atomState: AtomState,
    epochNumber: EpochNumber,
  ][] = []
  const visiting = new WeakSet<AnyAtom>()
  const visited = new WeakSet<AnyAtom>()
  // Visit the root atom. This is the only atom in the dependency graph
  // without incoming edges, which is one reason we can simplify the algorithm
  const stack: [a: AnyAtom, aState: AtomState][] = Array.from(changedAtoms)
  while (stack.length) {
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
      if (invalidatedAtoms.get(a) === aState.n) {
        topSortedReversed.push([a, aState, aState.n])
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
    for (const d of getMountedOrPendingDependents(storeState, a)) {
      if (!visiting.has(d)) {
        stack.push([d, ensureAtomState(d)])
      }
    }
  }
  // Step 2: use the topSortedReversed atom list to recompute all affected atoms
  // Track what's changed, so that we can short circuit when possible
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
      readAtomState(storeState, a)
      mountDependencies(storeState, a)
      if (prevEpochNumber !== aState.n) {
        changedAtoms.set(a, aState)
        storeHooks.c?.(a)
      }
    }
    invalidatedAtoms.delete(a)
  }
}

// TODO(daishi): revisit this implementation
const setAtomStateValueOrPromise = (
  storeState: StoreState,
  atom: AnyAtom,
  valueOrPromise: unknown,
): void => {
  const [, , ensureAtomState] = storeState
  const atomState = ensureAtomState(atom)
  const hasPrevValue = 'v' in atomState
  const prevValue = atomState.v
  const pendingPromise = isPendingPromise(atomState.v) ? atomState.v : null
  if (isPromiseLike(valueOrPromise)) {
    patchPromiseForCancelability(valueOrPromise)
    for (const a of atomState.d.keys()) {
      addPendingPromiseToDependency(atom, valueOrPromise, ensureAtomState(a))
    }
  }
  atomState.v = valueOrPromise
  delete atomState.e
  if (!hasPrevValue || !Object.is(prevValue, atomState.v)) {
    ++atomState.n
    if (pendingPromise) {
      cancelPromise(pendingPromise, valueOrPromise)
    }
  }
}

const readAtomState = <Value>(
  storeState: StoreState,
  atom: Atom<Value>,
): AtomState<Value> => {
  const [
    [, , atomRead],
    storeHooks,
    ensureAtomState,
    mountedAtoms,
    invalidatedAtoms,
    changedAtoms,
  ] = storeState
  const atomState = ensureAtomState(atom)
  // See if we can skip recomputing this atom.
  if (isAtomStateInitialized(atomState)) {
    // If the atom is mounted, we can use cached atom state.
    // because it should have been updated by dependencies.
    // We can't use the cache if the atom is invalidated.
    if (mountedAtoms.has(atom) && invalidatedAtoms.get(atom) !== atomState.n) {
      return atomState
    }
    // Otherwise, check if the dependencies have changed.
    // If all dependencies haven't changed, we can use the cache.
    if (
      Array.from(atomState.d).every(
        ([a, n]) =>
          // Recursively, read the atom state of the dependency, and
          // check if the atom epoch number is unchanged
          readAtomState(storeState, a).n === n,
      )
    ) {
      return atomState
    }
  }
  // Compute a new state for this atom.
  atomState.d.clear()
  let isSync = true
  const mountDependenciesIfAsync = () => {
    if (mountedAtoms.has(atom)) {
      mountDependencies(storeState, atom)
      recomputeInvalidatedAtoms(storeState)
      flushCallbacks(storeState)
    }
  }
  const getter: Getter = <V>(a: Atom<V>) => {
    if (isSelfAtom(atom, a)) {
      const aState = ensureAtomState(a)
      if (!isAtomStateInitialized(aState)) {
        if (hasInitialValue(a)) {
          setAtomStateValueOrPromise(storeState, a, a.init)
        } else {
          // NOTE invalid derived atoms can reach here
          throw new Error('no atom init')
        }
      }
      return returnAtomValue(aState)
    }
    // a !== atom
    const aState = readAtomState(storeState, a)
    try {
      return returnAtomValue(aState)
    } finally {
      atomState.d.set(a, aState.n)
      if (isPendingPromise(atomState.v)) {
        addPendingPromiseToDependency(atom, atomState.v, aState)
      }
      mountedAtoms.get(a)?.t.add(atom)
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
              return writeAtomState(storeState, atom, ...args)
            } finally {
              recomputeInvalidatedAtoms(storeState)
              flushCallbacks(storeState)
            }
          }
        }
      }
      return setSelf
    },
  }
  const prevEpochNumber = atomState.n
  try {
    const valueOrPromise = atomRead(atom, getter, options as never)
    setAtomStateValueOrPromise(storeState, atom, valueOrPromise)
    if (isPromiseLike(valueOrPromise)) {
      valueOrPromise.onCancel?.(() => controller?.abort())
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
      changedAtoms.set(atom, atomState)
      storeHooks.c?.(atom)
    }
  }
}

// TODO(daishi): revisit this implementation
const getMountedOrPendingDependents = (
  storeState: StoreState,
  atom: AnyAtom,
): Set<AnyAtom> => {
  const [, , ensureAtomState, mountedAtoms] = storeState
  const atomState = ensureAtomState(atom)
  const dependents = new Set<AnyAtom>()
  for (const a of mountedAtoms.get(atom)?.t || []) {
    if (mountedAtoms.has(a)) {
      dependents.add(a)
    }
  }
  for (const atomWithPendingPromise of atomState.p) {
    dependents.add(atomWithPendingPromise)
  }
  return dependents
}

const invalidateDependents = (storeState: StoreState, atom: AnyAtom): void => {
  const [, , ensureAtomState, , invalidatedAtoms] = storeState
  const stack: AnyAtom[] = [atom]
  while (stack.length) {
    const a = stack.pop()!
    for (const d of getMountedOrPendingDependents(storeState, a)) {
      const dState = ensureAtomState(d)
      invalidatedAtoms.set(d, dState.n)
      stack.push(d)
    }
  }
}

const writeAtomState = <Value, Args extends unknown[], Result>(
  storeState: StoreState,
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
): Result => {
  const [[, , , atomWrite], storeHooks, ensureAtomState, , , changedAtoms] =
    storeState
  let isSync = true
  const getter: Getter = <V>(a: Atom<V>) =>
    returnAtomValue(readAtomState(storeState, a))
  const setter: Setter = <V, As extends unknown[], R>(
    a: WritableAtom<V, As, R>,
    ...args: As
  ) => {
    const aState = ensureAtomState(a)
    try {
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const prevEpochNumber = aState.n
        const v = args[0] as V
        setAtomStateValueOrPromise(storeState, a, v)
        mountDependencies(storeState, a)
        if (prevEpochNumber !== aState.n) {
          changedAtoms.set(a, aState)
          storeHooks.c?.(a)
          invalidateDependents(storeState, a)
        }
        return undefined as R
      } else {
        return writeAtomState(storeState, a, ...args)
      }
    } finally {
      if (!isSync) {
        recomputeInvalidatedAtoms(storeState)
        flushCallbacks(storeState)
      }
    }
  }
  try {
    return atomWrite(atom, getter, setter, ...args)
  } finally {
    isSync = false
  }
}

const mountDependencies = (storeState: StoreState, atom: AnyAtom): void => {
  const [, storeHooks, ensureAtomState, mountedAtoms, , changedAtoms] =
    storeState
  const atomState = ensureAtomState(atom)
  const mounted = mountedAtoms.get(atom)
  if (mounted && !isPendingPromise(atomState.v)) {
    for (const [a, n] of atomState.d) {
      if (!mounted.d.has(a)) {
        const aState = ensureAtomState(a)
        const aMounted = mountAtom(storeState, a)
        aMounted.t.add(atom)
        mounted.d.add(a)
        if (n !== aState.n) {
          changedAtoms.set(a, aState)
          storeHooks.c?.(a)
          invalidateDependents(storeState, a)
        }
      }
    }
    for (const a of mounted.d || []) {
      if (!atomState.d.has(a)) {
        mounted.d.delete(a)
        const aMounted = unmountAtom(storeState, a)
        aMounted?.t.delete(atom)
      }
    }
  }
}

const mountAtom = <Value>(
  storeState: StoreState,
  atom: Atom<Value>,
): Mounted => {
  const [
    [, , , , , atomOnMount],
    storeHooks,
    ensureAtomState,
    mountedAtoms,
    ,
    ,
    mountCallbacks,
  ] = storeState
  const atomState = ensureAtomState(atom)
  let mounted = mountedAtoms.get(atom)
  if (!mounted) {
    // recompute atom state
    readAtomState(storeState, atom)
    // mount dependencies first
    for (const a of atomState.d.keys()) {
      const aMounted = mountAtom(storeState, a)
      aMounted.t.add(atom)
    }
    // mount self
    mounted = {
      l: new Set(),
      d: new Set(atomState.d.keys()),
      t: new Set(),
    }
    mountedAtoms.set(atom, mounted)
    storeHooks.m?.(atom)
    if (isActuallyWritableAtom(atom)) {
      const processOnMount = () => {
        let isSync = true
        const setAtom = (...args: unknown[]) => {
          try {
            return writeAtomState(storeState, atom, ...args)
          } finally {
            if (!isSync) {
              recomputeInvalidatedAtoms(storeState)
              flushCallbacks(storeState)
            }
          }
        }
        try {
          const onUnmount = atomOnMount(atom, setAtom)
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

const unmountAtom = <Value>(
  storeState: StoreState,
  atom: Atom<Value>,
): Mounted | undefined => {
  const [, storeHooks, ensureAtomState, mountedAtoms, , , , unmountCallbacks] =
    storeState
  const atomState = ensureAtomState(atom)
  let mounted = mountedAtoms.get(atom)
  if (
    mounted &&
    !mounted.l.size &&
    !Array.from(mounted.t).some((a) => mountedAtoms.get(a)?.d.has(atom))
  ) {
    // unmount self
    if (mounted.u) {
      unmountCallbacks.add(mounted.u)
    }
    mounted = undefined
    mountedAtoms.delete(atom)
    storeHooks.u?.(atom)
    // unmount dependencies
    for (const a of atomState.d.keys()) {
      const aMounted = unmountAtom(storeState, a)
      aMounted?.t.delete(atom)
    }
    return undefined
  }
  return mounted
}

//
// Secret store methods (not for export)
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

type StoreHooks = Readonly<{
  /**
   * Listener to notify when the atom value is changed.
   * This is an experimental API.
   */
  c?: StoreHookForAtoms
  /**
   * Listener to notify when the atom is mounted.
   * This is an experimental API.
   */
  m?: StoreHookForAtoms
  /**
   * Listener to notify when the atom is unmounted.
   * This is an experimental API.
   */
  u?: StoreHookForAtoms
  /**
   * Listener to notify when callbacks are being flushed.
   * This is an experimental API.
   */
  f?: StoreHook
}>

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
  return notify as never
}

const initializeStoreHooks = (storeState: StoreState): Required<StoreHooks> => {
  type Mutable<T> = { -readonly [P in keyof T]: T[P] }
  const storeHooks = storeState[1] as Mutable<Required<StoreHooks>>
  storeHooks.c ||= createStoreHookForAtoms()
  storeHooks.m ||= createStoreHookForAtoms()
  storeHooks.u ||= createStoreHookForAtoms()
  storeHooks.f ||= createStoreHook()
  return storeHooks
}

type StoreArgs = [
  getAtomState: <Value>(atom: Atom<Value>) => AtomState<Value> | undefined,
  setAtomState: <Value>(atom: Atom<Value>, atomState: AtomState<Value>) => void,
  atomRead: <Value>(
    atom: Atom<Value>,
    ...params: Parameters<Atom<Value>['read']>
  ) => Value,
  atomWrite: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...params: Parameters<WritableAtom<Value, Args, Result>['write']>
  ) => Result,
  atomOnInit: <Value>(atom: Atom<Value>, store: Store) => void,
  atomOnMount: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    setAtom: (...args: Args) => Result,
  ) => OnUnmount | void,
]

const STORE_STATE: unique symbol = Symbol() // no description intentionally

type StoreState = readonly [
  storeArgs: StoreArgs,
  storeHooks: StoreHooks,
  ensureAtomState: <Value>(atom: Atom<Value>) => AtomState<Value>,
  mountedAtoms: WeakMap<AnyAtom, Mounted>,
  invalidatedAtoms: WeakMap<AnyAtom, EpochNumber>,
  changedAtoms: Map<AnyAtom, INTERNAL_AtomState>,
  mountCallbacks: Set<() => void>,
  unmountCallbacks: Set<() => void>,
]

// Do not export this type.
type Store = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
  [STORE_STATE]?: StoreState
}

//
// Internal functions
//

export const INTERNAL_getStoreStateRev1 = (store: unknown): StoreState =>
  (store as Store)[STORE_STATE]!

export const INTERNAL_buildStore = (...storeArgs: StoreArgs): Store => {
  const [getAtomState, setAtomState, , , atomOnInit] = storeArgs
  const storeHooks: StoreHooks = {}
  const ensureAtomState = <Value>(atom: Atom<Value>) => {
    if (import.meta.env?.MODE !== 'production' && !atom) {
      throw new Error('Atom is undefined or null')
    }
    let atomState = getAtomState(atom)
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      setAtomState(atom, atomState)
      atomOnInit?.(atom, store)
    }
    return atomState
  }

  // These are store state.
  // As they are not garbage collectable, they shouldn't be mutated during atom read.
  const mountedAtoms = new WeakMap<AnyAtom, Mounted>()
  const invalidatedAtoms = new WeakMap<AnyAtom, EpochNumber>()
  const changedAtoms = new Map<AnyAtom, INTERNAL_AtomState>()
  const mountCallbacks = new Set<() => void>()
  const unmountCallbacks = new Set<() => void>()

  const storeState: StoreState = [
    storeArgs,
    storeHooks,
    ensureAtomState,
    mountedAtoms,
    invalidatedAtoms,
    changedAtoms,
    mountCallbacks,
    unmountCallbacks,
  ]

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(storeState, atom))

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    try {
      return writeAtomState(storeState, atom, ...args)
    } finally {
      recomputeInvalidatedAtoms(storeState)
      flushCallbacks(storeState)
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const mounted = mountAtom(storeState, atom)
    const listeners = mounted.l
    listeners.add(listener)
    flushCallbacks(storeState)
    return () => {
      listeners.delete(listener)
      unmountAtom(storeState, atom)
      flushCallbacks(storeState)
    }
  }

  const store: Store = {
    get: readAtom,
    set: writeAtom,
    sub: subscribeAtom,
  }
  Object.defineProperty(store, STORE_STATE, { value: storeState })
  return store
}

export const INTERNAL_flushCallbacks: typeof flushCallbacks = flushCallbacks
export const INTERNAL_recomputeInvalidatedAtoms: typeof recomputeInvalidatedAtoms =
  recomputeInvalidatedAtoms
export const INTERNAL_setAtomStateValueOrPromise: typeof setAtomStateValueOrPromise =
  setAtomStateValueOrPromise
export const INTERNAL_readAtomState: typeof readAtomState = readAtomState
export const INTERNAL_getMountedOrPendingDependents: typeof getMountedOrPendingDependents =
  getMountedOrPendingDependents
export const INTERNAL_invalidateDependents: typeof invalidateDependents =
  invalidateDependents
export const INTERNAL_writeAtomState: typeof writeAtomState = writeAtomState
export const INTERNAL_mountDependencies: typeof mountDependencies =
  mountDependencies
export const INTERNAL_mountAtom: typeof mountAtom = mountAtom
export const INTERNAL_unmountAtom: typeof unmountAtom = unmountAtom
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
export const INTERNAL_isPendingPromise: typeof isPendingPromise =
  isPendingPromise
export const INTERNAL_cancelPromise: typeof cancelPromise = cancelPromise
export const INTERNAL_patchPromiseForCancelability: typeof patchPromiseForCancelability =
  patchPromiseForCancelability
export const INTERNAL_isPromiseLike: typeof isPromiseLike = isPromiseLike
export const INTERNAL_addPendingPromiseToDependency: typeof addPendingPromiseToDependency =
  addPendingPromiseToDependency

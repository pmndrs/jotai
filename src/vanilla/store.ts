import type { Atom, WritableAtom } from './atom.ts'
import type { ExtractAtomValue } from './typeUtils.ts'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]

type CancelHandler = (nextValue: unknown) => void
type PromiseState = [cancelHandlers: Set<CancelHandler>, settled: boolean]

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

type BatchPriority = 'H' | 'M' | 'L'

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

// internal & unstable type
type StoreArgs = readonly [
  getAtomState: <Value>(atom: Atom<Value>) => AtomState<Value>,
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
  internals: Record<string, unknown>,
]

// for debugging purpose only
type DevStoreRev4 = {
  dev4_get_internal_weak_map: () => {
    get: (atom: AnyAtom) => AtomState | undefined
  }
  dev4_get_mounted_atoms: () => Set<AnyAtom>
  dev4_restore_atoms: (values: Iterable<readonly [AnyAtom, AnyValue]>) => void
}

type Store = {
  get: <Value>(atom: Atom<Value>) => Value
  set: <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ) => Result
  sub: (atom: AnyAtom, listener: () => void) => () => void
  unstable_derive: (fn: (...args: StoreArgs) => StoreArgs) => Store
}

export type INTERNAL_DevStoreRev4 = DevStoreRev4
export type INTERNAL_PrdStore = Store

const buildStore = (
  ...[getAtomState, atomRead, atomWrite, atomOnMount, internals]: StoreArgs
): Store => {
  const f = {
    isSelfAtom: (atom: AnyAtom, a: AnyAtom): boolean =>
      atom.unstable_is ? atom.unstable_is(a) : a === atom,

    hasInitialValue: <T extends Atom<AnyValue>>(
      atom: T,
    ): atom is T & { init: ExtractAtomValue<T> } => 'init' in atom,

    isActuallyWritableAtom: (atom: AnyAtom): atom is AnyWritableAtom =>
      !!(atom as AnyWritableAtom).write,

    //
    // Cancelable Promise
    //

    cancelablePromiseMap: new WeakMap<PromiseLike<unknown>, PromiseState>(),

    isPendingPromise: (value: unknown): value is PromiseLike<unknown> =>
      f.isPromiseLike(value) && !f.cancelablePromiseMap.get(value)?.[1],

    cancelPromise: <T>(promise: PromiseLike<T>, nextValue: unknown) => {
      const promiseState = f.cancelablePromiseMap.get(promise)
      if (promiseState) {
        promiseState[1] = true
        promiseState[0].forEach((fn) => fn(nextValue))
      } else if (import.meta.env?.MODE !== 'production') {
        throw new Error('[Bug] cancelable promise not found')
      }
    },

    patchPromiseForCancelability: <T>(promise: PromiseLike<T>) => {
      if (f.cancelablePromiseMap.has(promise)) {
        // already patched
        return
      }
      const promiseState: PromiseState = [new Set(), false]
      f.cancelablePromiseMap.set(promise, promiseState)
      const settle = () => {
        promiseState[1] = true
      }
      promise.then(settle, settle)
      ;(promise as { onCancel?: (fn: CancelHandler) => void }).onCancel = (
        fn,
      ) => {
        promiseState[0].add(fn)
      }
    },

    isPromiseLike: (
      x: unknown,
    ): x is PromiseLike<unknown> & { onCancel?: (fn: CancelHandler) => void } =>
      typeof (x as any)?.then === 'function',

    isAtomStateInitialized: <Value>(atomState: AtomState<Value>) =>
      'v' in atomState || 'e' in atomState,

    returnAtomValue: <Value>(atomState: AtomState<Value>): Value => {
      if ('e' in atomState) {
        throw atomState.e
      }
      if (import.meta.env?.MODE !== 'production' && !('v' in atomState)) {
        throw new Error('[Bug] atom state is not initialized')
      }
      return atomState.v!
    },

    addPendingPromiseToDependency: (
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
    },

    addDependency: <Value>(
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
      if (f.isPendingPromise(atomState.v)) {
        f.addPendingPromiseToDependency(atom, atomState.v, aState)
      }
      aState.m?.t.add(atom)
      if (batch) {
        f.addBatchAtomDependent(batch, a, atom)
      }
    },

    //
    // Batch
    //

    createBatch: (): Batch => ({
      D: new Map(),
      H: new Set(),
      M: new Set(),
      L: new Set(),
    }),

    addBatchFunc: (batch: Batch, priority: BatchPriority, fn: () => void) => {
      batch[priority].add(fn)
    },

    registerBatchAtom: (batch: Batch, atom: AnyAtom, atomState: AtomState) => {
      if (!batch.D.has(atom)) {
        batch.D.set(atom, new Set())
        f.addBatchFunc(batch, 'M', () => {
          atomState.m?.l.forEach((listener) =>
            f.addBatchFunc(batch, 'M', listener),
          )
        })
      }
    },

    addBatchAtomDependent: (
      batch: Batch,
      atom: AnyAtom,
      dependent: AnyAtom,
    ) => {
      const dependents = batch.D.get(atom)
      if (dependents) {
        dependents.add(dependent)
      }
    },

    getBatchAtomDependents: (batch: Batch, atom: AnyAtom) => batch.D.get(atom),

    flushBatch: (batch: Batch) => {
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
    },

    setAtomStateValueOrPromise: (
      atom: AnyAtom,
      atomState: AtomState,
      valueOrPromise: unknown,
    ) => {
      const hasPrevValue = 'v' in atomState
      const prevValue = atomState.v
      const pendingPromise = f.isPendingPromise(atomState.v)
        ? atomState.v
        : null
      if (f.isPromiseLike(valueOrPromise)) {
        f.patchPromiseForCancelability(valueOrPromise)
        for (const a of atomState.d.keys()) {
          f.addPendingPromiseToDependency(atom, valueOrPromise, getAtomState(a))
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
          f.cancelPromise(pendingPromise, valueOrPromise)
        }
      }
    },

    readAtomState: <Value>(
      batch: Batch | undefined,
      atom: Atom<Value>,
    ): AtomState<Value> => {
      const atomState = getAtomState(atom)
      // See if we can skip recomputing this atom.
      if (f.isAtomStateInitialized(atomState)) {
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
              f.readAtomState(batch, a).n === n,
          )
        ) {
          return atomState
        }
      }
      // Compute a new state for this atom.
      atomState.d.clear()
      let isSync = true
      const getter: Getter = <V>(a: Atom<V>) => {
        if (f.isSelfAtom(atom, a)) {
          const aState = getAtomState(a)
          if (!f.isAtomStateInitialized(aState)) {
            if (f.hasInitialValue(a)) {
              f.setAtomStateValueOrPromise(a, aState, a.init)
            } else {
              // NOTE invalid derived atoms can reach here
              throw new Error('no atom init')
            }
          }
          return f.returnAtomValue(aState)
        }
        // a !== atom
        const aState = f.readAtomState(batch, a)
        try {
          return f.returnAtomValue(aState)
        } finally {
          if (isSync) {
            f.addDependency(batch, atom, atomState, a, aState)
          } else {
            const batch = f.createBatch()
            f.addDependency(batch, atom, atomState, a, aState)
            f.mountDependencies(batch, atom, atomState)
            f.flushBatch(batch)
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
            !f.isActuallyWritableAtom(atom)
          ) {
            console.warn('setSelf function cannot be used with read-only atom')
          }
          if (!setSelf && f.isActuallyWritableAtom(atom)) {
            setSelf = (...args) => {
              if (import.meta.env?.MODE !== 'production' && isSync) {
                console.warn('setSelf function cannot be called in sync')
              }
              if (!isSync) {
                return f.writeAtom(atom, ...args)
              }
            }
          }
          return setSelf
        },
      }
      try {
        const valueOrPromise = atomRead(atom, getter, options as never)
        f.setAtomStateValueOrPromise(atom, atomState, valueOrPromise)
        if (f.isPromiseLike(valueOrPromise)) {
          valueOrPromise.onCancel?.(() => controller?.abort())
          const complete = () => {
            if (atomState.m) {
              const batch = f.createBatch()
              f.mountDependencies(batch, atom, atomState)
              f.flushBatch(batch)
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
    },

    readAtom: <Value>(atom: Atom<Value>): Value =>
      f.returnAtomValue(f.readAtomState(undefined, atom)),

    getMountedOrBatchDependents: <Value>(
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
      f.getBatchAtomDependents(batch, atom)?.forEach((dependent) => {
        dependents.set(dependent, getAtomState(dependent))
      })
      return dependents
    },

    recomputeDependents: <Value>(
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
        for (const [d, s] of f.getMountedOrBatchDependents(batch, a, aState)) {
          if (a !== d && !visiting.has(d)) {
            stack.push([d, s])
          }
        }
      }

      // Step 2: use the topSortedReversed atom list to recompute all affected atoms
      // Track what's changed, so that we can short circuit when possible
      f.addBatchFunc(batch, 'H', () => {
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
            f.readAtomState(batch, a)
            f.mountDependencies(batch, a, aState)
            if (prevEpochNumber !== aState.n) {
              f.registerBatchAtom(batch, a, aState)
              changedAtoms.add(a)
            }
          }
          delete aState.x
        }
      })
    },

    writeAtomState: <Value, Args extends unknown[], Result>(
      batch: Batch,
      atom: WritableAtom<Value, Args, Result>,
      ...args: Args
    ): Result => {
      let isSync = true
      const getter: Getter = <V>(a: Atom<V>) =>
        f.returnAtomValue(f.readAtomState(batch, a))
      const setter: Setter = <V, As extends unknown[], R>(
        a: WritableAtom<V, As, R>,
        ...args: As
      ) => {
        const aState = getAtomState(a)
        try {
          if (f.isSelfAtom(atom, a)) {
            if (!f.hasInitialValue(a)) {
              // NOTE technically possible but restricted as it may cause bugs
              throw new Error('atom not writable')
            }
            const prevEpochNumber = aState.n
            const v = args[0] as V
            f.setAtomStateValueOrPromise(a, aState, v)
            f.mountDependencies(batch, a, aState)
            if (prevEpochNumber !== aState.n) {
              f.registerBatchAtom(batch, a, aState)
              f.recomputeDependents(batch, a, aState)
            }
            return undefined as R
          } else {
            return f.writeAtomState(batch, a, ...args)
          }
        } finally {
          if (!isSync) {
            f.flushBatch(batch)
          }
        }
      }
      try {
        return atomWrite(atom, getter, setter, ...args)
      } finally {
        isSync = false
      }
    },

    writeAtom: <Value, Args extends unknown[], Result>(
      atom: WritableAtom<Value, Args, Result>,
      ...args: Args
    ): Result => {
      const batch = f.createBatch()
      try {
        return f.writeAtomState(batch, atom, ...args)
      } finally {
        f.flushBatch(batch)
      }
    },

    mountDependencies: (batch: Batch, atom: AnyAtom, atomState: AtomState) => {
      if (atomState.m && !f.isPendingPromise(atomState.v)) {
        for (const a of atomState.d.keys()) {
          if (!atomState.m.d.has(a)) {
            const aMounted = f.mountAtom(batch, a, getAtomState(a))
            aMounted.t.add(atom)
            atomState.m.d.add(a)
          }
        }
        for (const a of atomState.m.d || []) {
          if (!atomState.d.has(a)) {
            atomState.m.d.delete(a)
            const aMounted = f.unmountAtom(batch, a, getAtomState(a))
            aMounted?.t.delete(atom)
          }
        }
      }
    },

    mountAtom: <Value>(
      batch: Batch,
      atom: Atom<Value>,
      atomState: AtomState<Value>,
    ): Mounted => {
      if (!atomState.m) {
        // recompute atom state
        f.readAtomState(batch, atom)
        // mount dependencies first
        for (const a of atomState.d.keys()) {
          const aMounted = f.mountAtom(batch, a, getAtomState(a))
          aMounted.t.add(atom)
        }
        // mount self
        atomState.m = {
          l: new Set(),
          d: new Set(atomState.d.keys()),
          t: new Set(),
        }
        if (f.isActuallyWritableAtom(atom)) {
          const mounted = atomState.m
          let setAtom: (...args: unknown[]) => unknown
          const createInvocationContext = <T>(batch: Batch, fn: () => T) => {
            let isSync = true
            setAtom = (...args: unknown[]) => {
              try {
                return f.writeAtomState(batch, atom, ...args)
              } finally {
                if (!isSync) {
                  f.flushBatch(batch)
                }
              }
            }
            try {
              return fn()
            } finally {
              isSync = false
            }
          }
          f.addBatchFunc(batch, 'L', () => {
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
    },

    unmountAtom: <Value>(
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
          f.addBatchFunc(batch, 'L', () => onUnmount(batch))
        }
        delete atomState.m
        // unmount dependencies
        for (const a of atomState.d.keys()) {
          const aMounted = f.unmountAtom(batch, a, getAtomState(a))
          aMounted?.t.delete(atom)
        }
        return undefined
      }
      return atomState.m
    },

    subscribeAtom: (atom: AnyAtom, listener: () => void) => {
      const batch = f.createBatch()
      const atomState = getAtomState(atom)
      const mounted = f.mountAtom(batch, atom, atomState)
      const listeners = mounted.l
      listeners.add(listener)
      f.flushBatch(batch)
      return () => {
        listeners.delete(listener)
        const batch = f.createBatch()
        f.unmountAtom(batch, atom, atomState)
        f.flushBatch(batch)
      }
    },

    unstable_derive: (fn: (...args: StoreArgs) => StoreArgs) =>
      buildStore(...fn(getAtomState, atomRead, atomWrite, atomOnMount, f)),
  } as const
  Object.assign(f, internals)

  const store: Store = {
    get: f.readAtom,
    set: f.writeAtom,
    sub: f.subscribeAtom,
    unstable_derive: f.unstable_derive,
  }
  return store
}

const deriveDevStoreRev4 = (store: Store): Store & DevStoreRev4 => {
  const proxyAtomStateMap = new WeakMap()
  const debugMountedAtoms = new Set<AnyAtom>()
  let savedGetAtomState: StoreArgs[0]
  let inRestoreAtom = 0
  type HasInitialValue = <T extends Atom<AnyValue>>(
    atom: T,
  ) => atom is T & { init: ExtractAtomValue<T> }
  let hasInitialValue: HasInitialValue
  const derivedStore = store.unstable_derive(
    (getAtomState, atomRead, atomWrite, atomOnMount, internals) => {
      hasInitialValue = internals.hasInitialValue as HasInitialValue
      savedGetAtomState = getAtomState
      return [
        (atom) => {
          let proxyAtomState = proxyAtomStateMap.get(atom)
          if (!proxyAtomState) {
            const atomState = getAtomState(atom)
            proxyAtomState = new Proxy(atomState, {
              set(target, prop, value) {
                if (prop === 'm') {
                  debugMountedAtoms.add(atom)
                }
                return Reflect.set(target, prop, value)
              },
              deleteProperty(target, prop) {
                if (prop === 'm') {
                  debugMountedAtoms.delete(atom)
                }
                return Reflect.deleteProperty(target, prop)
              },
            })
            proxyAtomStateMap.set(atom, proxyAtomState)
          }
          return proxyAtomState
        },
        atomRead,
        (atom, getter, setter, ...args) => {
          if (inRestoreAtom) {
            return setter(atom, ...args)
          }
          return atomWrite(atom, getter, setter, ...args)
        },
        atomOnMount,
        internals,
      ]
    },
  )
  const savedStoreSet = derivedStore.set
  const devStore: DevStoreRev4 = {
    // store dev methods (these are tentative and subject to change without notice)
    dev4_get_internal_weak_map: () => ({
      get: (atom) => {
        const atomState = savedGetAtomState(atom)
        if (atomState.n === 0) {
          // for backward compatibility
          return undefined
        }
        return atomState
      },
    }),
    dev4_get_mounted_atoms: () => debugMountedAtoms,
    dev4_restore_atoms: (values) => {
      const restoreAtom: WritableAtom<null, [], void> = {
        read: () => null,
        write: (_get, set) => {
          ++inRestoreAtom
          try {
            for (const [atom, value] of values) {
              if (hasInitialValue(atom)) {
                set(atom as never, value)
              }
            }
          } finally {
            --inRestoreAtom
          }
        },
      }
      savedStoreSet(restoreAtom)
    },
  }
  return Object.assign(derivedStore, devStore)
}

type PrdOrDevStore = Store | (Store & DevStoreRev4)

export const createStore = (): PrdOrDevStore => {
  const atomStateMap = new WeakMap()
  const getAtomState = <Value>(atom: Atom<Value>) => {
    if (import.meta.env?.MODE !== 'production' && !atom) {
      throw new Error('Atom is undefined or null')
    }
    let atomState = atomStateMap.get(atom) as AtomState<Value> | undefined
    if (!atomState) {
      atomState = { d: new Map(), p: new Set(), n: 0 }
      atomStateMap.set(atom, atomState)
    }
    return atomState
  }
  const store = buildStore(
    getAtomState,
    (atom, ...params) => atom.read(...params),
    (atom, ...params) => atom.write(...params),
    (atom, ...params) => atom.onMount?.(...params),
    {},
  )
  if (import.meta.env?.MODE !== 'production') {
    return deriveDevStoreRev4(store)
  }
  return store
}

let defaultStore: PrdOrDevStore | undefined

export const getDefaultStore = (): PrdOrDevStore => {
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

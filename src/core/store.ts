import type { Atom, WritableAtom } from './atom'

type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AnyWritableAtom = WritableAtom<AnyAtomValue, unknown, void | Promise<void>>
type OnUnmount = () => void
type WriteGetter = Parameters<WritableAtom<AnyAtomValue, unknown>['write']>[0]
type Setter = Parameters<WritableAtom<AnyAtomValue, unknown>['write']>[1]

const hasInitialValue = <T extends Atom<AnyAtomValue>>(
  atom: T
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

const promiseAbortMap = new WeakMap<Promise<unknown>, () => void>()

export const registerPromiseAbort = (
  promise: Promise<unknown>,
  abort: () => void
) => {
  promiseAbortMap.set(promise, abort)
}

const cancelPromise = (promise: Promise<unknown>) => {
  promiseAbortMap.get(promise)?.()
}

const ATOM_STATE = Symbol() // for tag
type Revision = number
type ReadDependencies = Map<AnyAtom, Revision>

export const FULFILLED = 'fulfilled'
export const PENDING = 'pending'
export const REJECTED = 'rejected'
type Reason = unknown
const CANCELLED = Symbol() // for rejected reason

type Then<Value> = (
  onFulfill: (value: Value) => void,
  onReject: (error: Reason | typeof CANCELLED) => void
) => void

/**
 * Atom state, tracked for both mounted and unmounted atoms in a store.
 * Mutable only if a promise is settled.
 * @private This is for internal use and not considered part of the public API.
 */
export type AtomState<Value = AnyAtomValue> = {
  /**
   * tag
   */
  readonly t: typeof ATOM_STATE
  /**
   * Counts number of times atom has actually changed or recomputed.
   */
  readonly r: Revision
  /**
   * Validit(y) of the atom state.
   * Mounted atoms are considered invalidated when `y === false`.
   */
  readonly y: boolean
  /**
   * Maps from a dependency to the dependency's revision when it was last read.
   * We can skip recomputation of an atom by comparing the ReadDependencies revision
   * of each dependency to that dependencies's current revision.
   */
  readonly d: ReadDependencies
} & (
  | {
      status: typeof PENDING
      readonly then: Then<Awaited<Value>>
      readonly c: () => void // cancel promise
    }
  | {
      status: typeof FULFILLED
      readonly value: Awaited<Value>
    }
  | {
      status: typeof REJECTED
      readonly reason: Reason
    }
)

const isAtomState = (x: unknown): x is AtomState => (x as any)?.t === ATOM_STATE
const isValidAtomState = (atomState: AtomState) => atomState.y

/**
 * Represents a version of a store. A version contains a state for every atom
 * read during the version's lifetime.
 *
 * In concurrent React rendering, state can "branch" during transitions: the
 * current state may continue to be rendered while a new state is being built
 * concurrently. We key our atom state containers by this global version to
 * represent the state for each diverging branch.
 *
 * While a new version is being built, we read atom previous state from the
 * previous version.
 *
 * This is an INTERNAL type alias.
 */
export type VersionObject = {
  /**
   * "p"arent version.
   *
   * Once a version is committed completely, the `p` property is deleted so the
   * child version is independent, and the parent version can be garbage
   * collected.
   *
   * See [Provider] for more details on version data flow.
   */
  p?: VersionObject
}

type Listeners = Set<(version?: VersionObject) => void>
type Dependents = Set<AnyAtom>

/**
 * State tracked for mounted atoms. An atom is considered "mounted" if it has a
 * subscriber, or is a transitive dependency of another atom that has a
 * subscriber.
 *
 * The mounted state of an atom is freed once it is no longer mounted.
 */
type Mounted = {
  /** The list of subscriber functions. */
  l: Listeners
  /** Atoms that depend on *this* atom. Used to fan out invalidation. */
  t: Dependents
  /** Function to run when the atom is unmounted. */
  u?: OnUnmount
}

// for debugging purpose only
type StateListener = () => void
type MountedAtoms = Set<AnyAtom>

// store methods (not for public API)
/**
 * Read an atom's [AtomState], an internal data structure that is not considered
 * part of the public API. See [useAtom] for more details.
 *
 * Derived atom states may be recomputed if they are invalidated and any of
 * their transitive dependencies have changed.
 */
export const READ_ATOM = 'r'
/**
 * Invoke an atom's [WritableAtom.write] method with an update value.
 * That `write` method may set one or more atoms.
 * The default `write` method of primitive atoms just sets the atom itself to
 * the update value.
 */
export const WRITE_ATOM = 'w'
/**
 * Commit pending writes to an atom.
 * (The current implementation commits pending writes to all atoms; this is subject to change.)
 */
export const COMMIT_ATOM = 'c'
/**
 * Add a subscriber function to an atom. Returns a function that removes the
 * subscriber.
 *
 * The subscriber is called in two cases:
 *
 * - For writable atoms, the subscriber is called whenever the atom is directly
 *   changed by `atom.write`.
 * - For derived atoms, the subscriber is called whenever the atom is
 *   *invalidated* (i.e. when it's possibly transitive dependencies change or
 *   become invalidated), **not** when the actual Value of the atom changes.
 *   Derived atoms are only recomputed on read.
 */
export const SUBSCRIBE_ATOM = 's'
/**
 * Bulk-apply new values to atoms.
 */
export const RESTORE_ATOMS = 'h'

// store dev methods (these are tentative and subject to change)
export const DEV_SUBSCRIBE_STATE = 'n'
export const DEV_GET_MOUNTED_ATOMS = 'l'
export const DEV_GET_ATOM_STATE = 'a'
export const DEV_GET_MOUNTED = 'm'

/**
 * Create a new store. Each store is an independent, isolated universe of atom
 * states.
 *
 * Jotai atoms are not themselves state containers. When you read or write an
 * atom, that state is stored in a store. You can think of a Store like a
 * multi-layered map from atoms to states, like this:
 *
 * ```
 * // Conceptually, a Store is a map from atoms to states.
 * // The real type is a bit different.
 * type Store = Map<VersionObject, Map<Atom, AtomState>>
 * ```
 *
 * @param initialValues An iterable where item is a pair of [an atom, its
 *   initial value]. Use to set initial state of writable atoms; useful for
 *   testing.
 *
 * @returns A store.
 */
export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, AnyAtomValue]>
) => {
  const committedAtomStateMap = new WeakMap<AnyAtom, AtomState>()
  const mountedMap = new WeakMap<AnyAtom, Mounted>()
  const pendingMap = new Map<
    AnyAtom,
    AtomState /* prevAtomState */ | undefined
  >()
  let stateListeners: Set<StateListener>
  let mountedAtoms: MountedAtoms
  if (__DEV__) {
    stateListeners = new Set()
    mountedAtoms = new Set()
  }

  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState: AtomState = {
        t: ATOM_STATE,
        r: 0,
        y: true, // not invalidated
        d: new Map(),
        status: FULFILLED,
        value,
      }
      if (__DEV__) {
        if (!hasInitialValue(atom)) {
          console.warn(
            'Found initial value for derived atom which can cause unexpected behavior',
            atom
          )
        }
      }
      committedAtomStateMap.set(atom, atomState)
    }
  }

  const versionedAtomStateMapMap = new WeakMap<
    VersionObject,
    Map<AnyAtom, AtomState>
  >()
  const getVersionedAtomStateMap = (version: VersionObject) => {
    let versionedAtomStateMap = versionedAtomStateMapMap.get(version)
    if (!versionedAtomStateMap) {
      versionedAtomStateMap = new Map()
      versionedAtomStateMapMap.set(version, versionedAtomStateMap)
    }
    return versionedAtomStateMap
  }

  const getAtomState = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): AtomState<Value> | undefined => {
    if (version) {
      const versionedAtomStateMap = getVersionedAtomStateMap(version)
      let atomState = versionedAtomStateMap.get(atom) as
        | AtomState<Value>
        | undefined
      if (!atomState) {
        atomState = getAtomState(version.p, atom)
        if (atomState) {
          versionedAtomStateMap.set(atom, atomState)
        }
      }
      return atomState
    }
    return committedAtomStateMap.get(atom) as AtomState<Value> | undefined
  }

  const setAtomState = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    atomState: AtomState<Value>
  ): void => {
    if (version) {
      const versionedAtomStateMap = getVersionedAtomStateMap(version)
      versionedAtomStateMap.set(atom, atomState)
    } else {
      const prevAtomState = committedAtomStateMap.get(atom)
      committedAtomStateMap.set(atom, atomState)
      if (!pendingMap.has(atom)) {
        pendingMap.set(atom, prevAtomState)
      }
      if (prevAtomState?.status === PENDING) {
        prevAtomState.c() // cancel promise
      }
    }
  }

  const createReadDependencies = (
    version: VersionObject | undefined,
    prevReadDependencies: ReadDependencies = new Map(),
    dependencies?: Set<AnyAtom>
  ): ReadDependencies => {
    if (!dependencies) {
      return prevReadDependencies
    }
    const readDependencies: ReadDependencies = new Map()
    let changed = false
    dependencies.forEach((atom) => {
      const revision = getAtomState(version, atom)?.r || 0
      readDependencies.set(atom, revision)
      if (prevReadDependencies.get(atom) !== revision) {
        changed = true
      }
    })
    if (prevReadDependencies.size === readDependencies.size && !changed) {
      return prevReadDependencies
    }
    return readDependencies
  }

  const setAtomValue = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    value: Awaited<Value>,
    dependencies?: Set<AnyAtom>,
    force?: boolean
  ): AtomState<Value> => {
    const atomState = getAtomState(version, atom)
    let nextRev = atomState?.r || 0
    let nextDep = createReadDependencies(version, atomState?.d, dependencies)
    let changed = !atomState || !isValidAtomState(atomState)
    if (
      force ||
      !atomState ||
      atomState.status !== FULFILLED || // new value, or
      !Object.is(atomState.value, value) // different value
    ) {
      changed = true
      ++nextRev // increment revision
      if (nextDep.has(atom)) {
        nextDep = new Map(nextDep).set(atom, nextRev)
      }
    } else if (
      nextDep !== atomState.d &&
      (nextDep.size !== atomState.d.size ||
        !Array.from(nextDep.keys()).every((a) => atomState.d.has(a)))
    ) {
      changed = true
      // value is not changed, but dependencies are changed
      // we should schdule a flush in async
      // FIXME any better way? https://github.com/pmndrs/jotai/issues/947
      Promise.resolve().then(() => {
        flushPending(version)
      })
    }
    if (atomState && !changed) {
      return atomState
    }
    const nextAtomState: AtomState<Value> = {
      t: ATOM_STATE,
      r: nextRev,
      y: true, // not invalidated
      d: nextDep,
      status: FULFILLED,
      value,
    }
    setAtomState(version, atom, nextAtomState)
    return nextAtomState
  }

  const setAtomReadError = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    reason: Reason,
    dependencies?: Set<AnyAtom>
  ): AtomState<Value> => {
    const atomState = getAtomState(version, atom)
    const nextAtomState: AtomState<Value> = {
      t: ATOM_STATE,
      r: (atomState?.r || 0) + 1,
      y: true, // not invalidated
      d: createReadDependencies(version, atomState?.d, dependencies),
      status: REJECTED,
      reason,
    }
    setAtomState(version, atom, nextAtomState)
    return nextAtomState
  }

  const setAtomPromise = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    promise: Promise<Awaited<Value>>,
    dependencies?: Set<AnyAtom>
  ): AtomState<Value> => {
    const onFulfills: ((value: Awaited<Value>) => void)[] = []
    const onRejects: ((error: Reason | typeof CANCELLED) => void)[] = []
    let settled = false
    const cancel = () => {
      if (!settled) {
        if (__DEV__ && nextAtomState.status !== PENDING) {
          throw new Error('should not reach here')
        }
        settled = true
        cancelPromise(promise)
        onFulfills.splice(0)
        onRejects.splice(0).forEach((fn) => fn(CANCELLED))
      }
    }
    const retry = () => {
      if (settled) {
        return
      }
      const atomState = readAtomState(version, atom, true)
      if (atomState.status === PENDING) {
        atomState.then(resolve, reject)
      } else if (atomState.status === FULFILLED) {
        resolve(atomState.value)
      } else {
        // atomState.status === REJECTED
        if (__DEV__ && isAtomState(atomState.reason)) {
          throw new Error('should not reach here')
        }
        reject(atomState.reason)
      }
    }
    const resolve = (value: Awaited<Value>) => {
      if (settled) {
        return
      }
      if (__DEV__ && nextAtomState.status !== PENDING) {
        throw new Error('should not reach here')
      }
      settled = true
      setAtomValue(version, atom, value, dependencies, true)
      // FIXME better partially mutable typing?
      ;(nextAtomState as any).status = FULFILLED
      ;(nextAtomState as any).value = value
      delete (nextAtomState as any).then
      delete (nextAtomState as any).c
      onFulfills.splice(0).forEach((fn) => fn(value))
      onRejects.splice(0)
    }
    const reject = (reason: Reason | typeof CANCELLED) => {
      if (settled) {
        return
      }
      if (reason === CANCELLED) {
        retry()
        return
      }
      if (isAtomState(reason)) {
        if (reason.status === PENDING) {
          reason.then(retry, retry)
        } else {
          retry()
        }
        return
      }
      if (__DEV__ && nextAtomState.status !== PENDING) {
        throw new Error('should not reach here')
      }
      settled = true
      setAtomReadError(version, atom, reason, dependencies)
      // FIXME better partially mutable typing?
      ;(nextAtomState as any).status = REJECTED
      ;(nextAtomState as any).reason = reason
      delete (nextAtomState as any).then
      delete (nextAtomState as any).c
      onFulfills.splice(0)
      onRejects.splice(0).forEach((fn) => fn(reason))
    }
    promise.then(resolve, reject)
    const atomState = getAtomState(version, atom)
    const nextAtomState: AtomState<Value> = {
      t: ATOM_STATE,
      r: (atomState?.r || 0) + 1,
      y: true, // not invalidated
      d: createReadDependencies(version, atomState?.d, dependencies),
      status: PENDING,
      then: (onFulfill, onReject) => {
        if (nextAtomState.status === FULFILLED) {
          onFulfill(nextAtomState.value)
        } else if (nextAtomState.status === REJECTED) {
          onReject(nextAtomState.reason)
        } else if (settled) {
          onReject(CANCELLED)
        } else {
          onFulfills.push(onFulfill)
          onRejects.push(onReject)
        }
      },
      c: cancel,
    }
    setAtomState(version, atom, nextAtomState)
    return nextAtomState
  }

  const setAtomInvalidated = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): void => {
    const atomState = getAtomState(version, atom)
    if (atomState) {
      const nextAtomState: AtomState<Value> = {
        ...atomState, // copy everything
        y: false, // invalidated
      }
      setAtomState(version, atom, nextAtomState)
    } else if (__DEV__) {
      console.warn('[Bug] could not invalidate non existing atom', atom)
    }
  }

  const readAtomState = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    force?: boolean
  ): AtomState<Value> => {
    if (!force) {
      // See if we can skip recomputing this atom.
      const atomState = getAtomState(version, atom)
      if (atomState) {
        // First, check if we already have suspending promise
        if (isValidAtomState(atomState) && atomState.status === PENDING) {
          return atomState
        }
        // Second, ensure that each atom we depend on is up to date.
        // Recursive calls to `readAtomState(version, a)` will recompute `a` if
        // it's out of date thus increment its revision number if it changes.
        atomState.d.forEach((_, a) => {
          if (a !== atom) {
            if (!mountedMap.has(a)) {
              // Dependency is new or unmounted.
              // Invalidation doesn't touch unmounted atoms, so we need to recurse
              // into this dependency in case it needs to update.
              readAtomState(version, a)
            } else {
              // Dependency is mounted.
              const aState = getAtomState(version, a)
              if (aState && !isValidAtomState(aState)) {
                readAtomState(version, a)
              }
            }
          }
        })
        // If a dependency's revision changed since this atom was last computed,
        // then we're out of date and need to recompute.
        if (
          Array.from(atomState.d).every(
            // revision is equal to the last one
            ([a, r]) => getAtomState(version, a)?.r === r
          )
        ) {
          if (!isValidAtomState(atomState)) {
            return { ...atomState, y: true }
          }
          return atomState
        }
      }
    }
    // Compute a new state for this atom.
    const dependencies = new Set<AnyAtom>()
    try {
      const promiseOrValue = atom.read(<V>(a: Atom<V>) => {
        dependencies.add(a)
        const aState =
          (a as AnyAtom) === atom
            ? getAtomState(version, a)
            : readAtomState(version, a)
        if (aState) {
          if (aState.status === FULFILLED) {
            return aState.value
          }
          throw aState
        }
        if (hasInitialValue(a)) {
          return a.init
        }
        // NOTE invalid derived atoms can reach here
        throw new Error('no atom init')
      })
      if (promiseOrValue instanceof Promise) {
        return setAtomPromise(version, atom, promiseOrValue, dependencies)
      }
      return setAtomValue(
        version,
        atom,
        promiseOrValue as Awaited<Value>,
        dependencies
      )
    } catch (thrown) {
      if (isAtomState(thrown)) {
        if (thrown.status === PENDING) {
          const promise = Promise.reject(thrown)
          return setAtomPromise(version, atom, promise, dependencies)
        }
        if (thrown.status === REJECTED) {
          return setAtomReadError(version, atom, thrown.reason, dependencies)
        }
        if (__DEV__) {
          throw new Error('should not reach here')
        }
      }
      return setAtomReadError(version, atom, thrown, dependencies)
    }
  }

  const readAtom = <Value>(
    readingAtom: Atom<Value>,
    version?: VersionObject
  ): AtomState<Value> => {
    const atomState = readAtomState(version, readingAtom)
    return atomState
  }

  const addAtom = (
    version: VersionObject | undefined,
    addingAtom: AnyAtom
  ): Mounted => {
    let mounted = mountedMap.get(addingAtom)
    if (!mounted) {
      mounted = mountAtom(version, addingAtom)
    }
    return mounted
  }

  // FIXME doesn't work with mutually dependent atoms
  const canUnmountAtom = (atom: AnyAtom, mounted: Mounted) =>
    !mounted.l.size &&
    (!mounted.t.size || (mounted.t.size === 1 && mounted.t.has(atom)))

  const delAtom = (
    version: VersionObject | undefined,
    deletingAtom: AnyAtom
  ): void => {
    const mounted = mountedMap.get(deletingAtom)
    if (mounted && canUnmountAtom(deletingAtom, mounted)) {
      unmountAtom(version, deletingAtom)
    }
  }

  const invalidateDependents = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): void => {
    const mounted = mountedMap.get(atom)
    mounted?.t.forEach((dependent) => {
      if (dependent !== atom) {
        setAtomInvalidated(version, dependent)
        invalidateDependents(version, dependent)
      }
    })
  }

  const writeAtomState = <Value, Update, Result extends void | Promise<void>>(
    version: VersionObject | undefined,
    atom: WritableAtom<Value, Update, Result>,
    update: Update
  ): Result => {
    let isSync = true
    const writeGetter: WriteGetter = <V>(
      a: Atom<V>,
      options?: {
        unstable_promise: true
      }
    ) => {
      const aState = readAtomState(version, a)
      if (aState.status === FULFILLED) {
        return aState.value
      }
      if (aState.status === REJECTED) {
        throw aState
      }
      // aState.status === PENDING
      if (options?.unstable_promise) {
        return new Promise((resolve) => {
          const retry = () => resolve(writeGetter(a, options) as any)
          aState.then(retry, retry)
        })
      }
      if (__DEV__) {
        console.info(
          'Reading pending atom state in write operation. We throw a promise for now.',
          a
        )
      }
      throw aState
    }
    const setter: Setter = <V, U, R extends void | Promise<void>>(
      a: WritableAtom<V, U, R>,
      v?: V
    ) => {
      let promiseOrVoid: void | Promise<void>
      if ((a as AnyWritableAtom) === atom) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const prevAtomState = getAtomState(version, a)
        const nextAtomState =
          v instanceof Promise
            ? setAtomPromise(version, a, v)
            : setAtomValue(version, a, v as Awaited<V>)
        if (prevAtomState !== nextAtomState) {
          invalidateDependents(version, a)
        }
      } else {
        promiseOrVoid = writeAtomState(version, a as AnyWritableAtom, v)
      }
      if (!isSync) {
        flushPending(version)
      }
      return promiseOrVoid
    }
    const promiseOrVoid = atom.write(writeGetter, setter, update)
    isSync = false
    return promiseOrVoid
  }

  const writeAtom = <Value, Update, Result extends void | Promise<void>>(
    writingAtom: WritableAtom<Value, Update, Result>,
    update: Update,
    version?: VersionObject
  ): Result => {
    const promiseOrVoid = writeAtomState(version, writingAtom, update)
    flushPending(version)
    return promiseOrVoid
  }

  const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
    !!(atom as AnyWritableAtom).write

  const mountAtom = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    initialDependent?: AnyAtom
  ): Mounted => {
    // mount self
    const mounted: Mounted = {
      t: new Set(initialDependent && [initialDependent]),
      l: new Set(),
    }
    mountedMap.set(atom, mounted)
    if (__DEV__) {
      mountedAtoms.add(atom)
    }
    // mount read dependencies before onMount
    const atomState = readAtomState(undefined, atom)
    atomState.d.forEach((_, a) => {
      const aMounted = mountedMap.get(a)
      if (aMounted) {
        aMounted.t.add(atom) // add dependent
      } else {
        if (a !== atom) {
          mountAtom(version, a, atom)
        }
      }
    })
    // onMount
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const setAtom = (update: unknown) => writeAtom(atom, update, version)
      const onUnmount = atom.onMount(setAtom)
      version = undefined
      if (onUnmount) {
        mounted.u = onUnmount
      }
    }
    return mounted
  }

  const unmountAtom = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): void => {
    // unmount self
    const onUnmount = mountedMap.get(atom)?.u
    if (onUnmount) {
      onUnmount()
    }
    mountedMap.delete(atom)
    if (__DEV__) {
      mountedAtoms.delete(atom)
    }
    // unmount read dependencies afterward
    const atomState = getAtomState(version, atom)
    if (atomState) {
      if (atomState.status === PENDING) {
        atomState.c() // cancel promise
      }
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          const mounted = mountedMap.get(a)
          if (mounted) {
            mounted.t.delete(atom)
            if (canUnmountAtom(a, mounted)) {
              unmountAtom(version, a)
            }
          }
        }
      })
    } else if (__DEV__) {
      console.warn('[Bug] could not find atom state to unmount', atom)
    }
  }

  const mountDependencies = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    atomState: AtomState<Value>,
    prevReadDependencies?: ReadDependencies
  ): void => {
    const dependencies = new Set(atomState.d.keys())
    prevReadDependencies?.forEach((_, a) => {
      if (dependencies.has(a)) {
        // not changed
        dependencies.delete(a)
        return
      }
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.delete(atom) // delete from dependents
        if (canUnmountAtom(a, mounted)) {
          unmountAtom(version, a)
        }
      }
    })
    dependencies.forEach((a) => {
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.add(atom) // add to dependents
      } else if (mountedMap.has(atom)) {
        // we mount dependencies only when atom is already mounted
        // Note: we should revisit this when you find other issues
        // https://github.com/pmndrs/jotai/issues/942
        mountAtom(version, a, atom)
      }
    })
  }

  const flushPending = (version: VersionObject | undefined): void => {
    if (version) {
      const versionedAtomStateMap = getVersionedAtomStateMap(version)
      versionedAtomStateMap.forEach((atomState, atom) => {
        const committedAtomState = committedAtomStateMap.get(atom)
        if (atomState !== committedAtomState) {
          const mounted = mountedMap.get(atom)
          mounted?.l.forEach((listener) => listener(version))
        }
      })
      return
    }
    while (pendingMap.size) {
      const pending = Array.from(pendingMap)
      pendingMap.clear()
      pending.forEach(([atom, prevAtomState]) => {
        const atomState = getAtomState(undefined, atom)
        if (atomState && atomState.d !== prevAtomState?.d) {
          mountDependencies(undefined, atom, atomState, prevAtomState?.d)
        }
        if (
          prevAtomState &&
          !isValidAtomState(prevAtomState) &&
          atomState &&
          isValidAtomState(atomState)
        ) {
          // We don't want to notify listeners
          // to avoid flushing a promise again (#1151)
          // and avoid extra re-renders (#1213).
          return
        }
        const mounted = mountedMap.get(atom)
        mounted?.l.forEach((listener) => listener())
      })
    }
    if (__DEV__) {
      stateListeners.forEach((l) => l())
    }
  }

  const commitVersionedAtomStateMap = (version: VersionObject) => {
    const versionedAtomStateMap = getVersionedAtomStateMap(version)
    versionedAtomStateMap.forEach((atomState, atom) => {
      const prevAtomState = committedAtomStateMap.get(atom)
      if (
        !prevAtomState ||
        atomState.r > prevAtomState.r ||
        atomState.y !== prevAtomState.y ||
        (atomState.r === prevAtomState.r && atomState.d !== prevAtomState.d)
      ) {
        committedAtomStateMap.set(atom, atomState)
        if (atomState.d !== prevAtomState?.d) {
          mountDependencies(version, atom, atomState, prevAtomState?.d)
        }
      }
    })
  }

  const commitAtom = (_atom: AnyAtom | null, version?: VersionObject) => {
    if (version) {
      commitVersionedAtomStateMap(version)
    }
    flushPending(undefined)
  }

  const subscribeAtom = (
    atom: AnyAtom,
    callback: (version?: VersionObject) => void,
    version?: VersionObject
  ) => {
    const mounted = addAtom(version, atom)
    const listeners = mounted.l
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
      // TODO should version be `undefined` for delAtom?
      delAtom(version, atom)
    }
  }

  const restoreAtoms = (
    values: Iterable<readonly [AnyAtom, AnyAtomValue]>,
    version?: VersionObject
  ): void => {
    for (const [atom, value] of values) {
      if (hasInitialValue(atom)) {
        if (value instanceof Promise) {
          setAtomPromise(version, atom, value)
        } else {
          setAtomValue(version, atom, value)
        }
        invalidateDependents(version, atom)
      }
    }
    flushPending(version)
  }

  if (__DEV__) {
    return {
      [READ_ATOM]: readAtom,
      [WRITE_ATOM]: writeAtom,
      [COMMIT_ATOM]: commitAtom,
      [SUBSCRIBE_ATOM]: subscribeAtom,
      [RESTORE_ATOMS]: restoreAtoms,
      [DEV_SUBSCRIBE_STATE]: (l: StateListener) => {
        stateListeners.add(l)
        return () => {
          stateListeners.delete(l)
        }
      },
      [DEV_GET_MOUNTED_ATOMS]: () => mountedAtoms.values(),
      [DEV_GET_ATOM_STATE]: (a: AnyAtom) => committedAtomStateMap.get(a),
      [DEV_GET_MOUNTED]: (a: AnyAtom) => mountedMap.get(a),
    }
  }
  return {
    [READ_ATOM]: readAtom,
    [WRITE_ATOM]: writeAtom,
    [COMMIT_ATOM]: commitAtom,
    [SUBSCRIBE_ATOM]: subscribeAtom,
    [RESTORE_ATOMS]: restoreAtoms,
  }
}

export type Store = ReturnType<typeof createStore>

export const createStoreForExport = (
  initialValues?: Iterable<readonly [AnyAtom, AnyAtomValue]>
) => {
  const store = createStore(initialValues)
  const get = <Value>(atom: Atom<Value>) => {
    const atomState = store[READ_ATOM](atom)
    if (atomState.status === REJECTED) {
      throw atomState.reason // read error
    }
    if (atomState.status === PENDING) {
      return undefined // suspended
    }
    return atomState.value
  }
  const asyncGet = <Value>(atom: Atom<Value>) =>
    new Promise<Awaited<Value>>((resolve, reject) => {
      const atomState = store[READ_ATOM](atom)
      if (atomState.status === REJECTED) {
        reject(atomState.reason) // read error
      } else if (atomState.status === PENDING) {
        // retry later
        new Promise(atomState.then).finally(() => {
          resolve(asyncGet(atom))
        })
      } else {
        resolve(atomState.value)
      }
    })
  const set = <Value, Update, Result extends void | Promise<void>>(
    atom: WritableAtom<Value, Update, Result>,
    update: Update
  ) => store[WRITE_ATOM](atom, update)
  const sub = (atom: AnyAtom, callback: () => void) =>
    store[SUBSCRIBE_ATOM](atom, callback)
  return {
    get,
    asyncGet,
    set,
    sub,
    SECRET_INTERNAL_store: store,
  }
}

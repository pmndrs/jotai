import type { Atom, WritableAtom } from './atom'

type AnyValue = unknown
type AnyError = unknown
type AnyAtom = Atom<AnyValue>
type AnyWritableAtom = WritableAtom<AnyValue, unknown[], unknown>
type OnUnmount = () => void
type Getter = Parameters<AnyAtom['read']>[0]
type Setter = Parameters<AnyWritableAtom['write']>[1]

const hasInitialValue = <T extends Atom<AnyValue>>(
  atom: T
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

const promiseAbortMap = new WeakMap<Promise<unknown>, () => void>()

const registerPromiseAbort = (promise: Promise<unknown>, abort: () => void) => {
  promiseAbortMap.set(promise, abort)
  promise.finally(() => promiseAbortMap.delete(promise))
}

const cancelPromise = (promise: Promise<unknown>) => {
  const abort = promiseAbortMap.get(promise)
  if (abort) {
    promiseAbortMap.delete(promise)
    abort()
  }
}

/**
 * Immutable map from a dependency to the dependency's atom state
 * when it was last read.
 * We can skip recomputation of an atom by comparing the atom state
 * of each dependency to that dependencies's current revision.
 */
type Dependencies = Map<AnyAtom, AtomState>

/**
 * Immutable atom state,
 * tracked for both mounted and unmounted atoms in a store.
 */
type AtomState<Value = AnyValue> = {
  d: Dependencies
} & ({ e: AnyError } | { v: Value })

type Listeners = Set<() => void>
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
  initialValues?: Iterable<readonly [AnyAtom, AnyValue]>
) => {
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()
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
        d: new Map(),
        v: value,
      }
      if (__DEV__) {
        Object.freeze(atomState)
        if (!hasInitialValue(atom)) {
          console.warn(
            'Found initial value for derived atom which can cause unexpected behavior',
            atom
          )
        }
      }
      atomStateMap.set(atom, atomState)
    }
  }

  const getAtomState = <Value>(atom: Atom<Value>) =>
    atomStateMap.get(atom) as AtomState<Value> | undefined

  const setAtomState = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>
  ): void => {
    if (__DEV__) {
      Object.freeze(atomState)
    }
    const prevAtomState = atomStateMap.get(atom)
    atomStateMap.set(atom, atomState)
    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevAtomState)
    }
    if (
      prevAtomState &&
      'v' in prevAtomState &&
      prevAtomState.v instanceof Promise
    ) {
      cancelPromise(prevAtomState.v)
    }
  }

  const updateDependencies = <Value>(
    atom: Atom<Value>,
    nextAtomState: AtomState<Value>,
    depSet: Set<AnyAtom>
  ): void => {
    const dependencies: Dependencies = new Map()
    let changed = false
    depSet.forEach((a) => {
      const aState = a === atom ? nextAtomState : getAtomState(a)
      if (aState) {
        dependencies.set(a, aState)
        if (nextAtomState.d.get(a) !== aState) {
          changed = true
        }
      } else if (__DEV__) {
        console.warn('[Bug] atom state not found')
      }
    })
    if (changed || nextAtomState.d.size !== dependencies.size) {
      nextAtomState.d = dependencies
    }
  }

  const setAtomValue = <Value>(
    atom: Atom<Value>,
    value: Value,
    depSet?: Set<AnyAtom>
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      v: value,
    }
    if (depSet) {
      updateDependencies(atom, nextAtomState, depSet)
    }
    if (
      prevAtomState &&
      'v' in prevAtomState &&
      Object.is(prevAtomState.v, value) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // bail out
      return prevAtomState
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const setAtomError = <Value>(
    atom: Atom<Value>,
    error: AnyError,
    depSet?: Set<AnyAtom>
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      e: error,
    }
    if (depSet) {
      updateDependencies(atom, nextAtomState, depSet)
    }
    if (
      prevAtomState &&
      'e' in prevAtomState &&
      Object.is(prevAtomState.e, error) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // bail out
      return prevAtomState
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const readAtomState = <Value>(atom: Atom<Value>): AtomState<Value> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (atomState) {
      // Ensure that each atom we depend on is up to date.
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          readAtomState(a)
        }
      })
      if (
        Array.from(atomState.d).every(
          ([a, s]) => a === atom || getAtomState(a) === s
        )
      ) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    const depSet = new Set<AnyAtom>()
    const controller = new AbortController()
    const getter: Getter = <V>(a: Atom<V>) => {
      depSet.add(a)
      const aState =
        (a as AnyAtom) === atom ? getAtomState(a) : readAtomState(a)
      if (aState) {
        if ('e' in aState) {
          throw aState.e
        }
        return aState.v
      }
      if (hasInitialValue(a)) {
        return a.init
      }
      // NOTE invalid derived atoms can reach here
      throw new Error('no atom init')
    }
    try {
      const value = atom.read(getter, { signal: controller.signal })
      if (value instanceof Promise) {
        registerPromiseAbort(value, () => controller.abort())
        value.finally(() => {
          setAtomValue(atom, value, depSet)
          flushPending()
        })
      }
      return setAtomValue(atom, value, depSet)
    } catch (error) {
      return setAtomError(atom, error, depSet)
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value => {
    const atomState = readAtomState(atom)
    if ('e' in atomState) {
      throw atomState.e
    }
    return atomState.v
  }

  const addAtom = (atom: AnyAtom): Mounted => {
    let mounted = mountedMap.get(atom)
    if (!mounted) {
      mounted = mountAtom(atom)
    }
    return mounted
  }

  // FIXME doesn't work with mutually dependent atoms
  const canUnmountAtom = (atom: AnyAtom, mounted: Mounted) =>
    !mounted.l.size &&
    (!mounted.t.size || (mounted.t.size === 1 && mounted.t.has(atom)))

  const delAtom = (atom: AnyAtom): void => {
    const mounted = mountedMap.get(atom)
    if (mounted && canUnmountAtom(atom, mounted)) {
      unmountAtom(atom)
    }
  }

  const recomputeDependents = <Value>(atom: Atom<Value>): void => {
    const mounted = mountedMap.get(atom)
    mounted?.t.forEach((dependent) => {
      if (dependent !== atom) {
        readAtomState(dependent)
        recomputeDependents(dependent)
      }
    })
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      const aState = readAtomState(a)
      if ('e' in aState) {
        throw aState.e
      }
      return aState.v
    }
    const setter: Setter = <V, As extends unknown[], R>(
      a: WritableAtom<V, As, R>,
      ...args: As
    ) => {
      let r: R | undefined
      if ((a as AnyWritableAtom) === atom) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const prevAtomState = getAtomState(a)
        const nextAtomState = setAtomValue(a, args[0] as V)
        if (prevAtomState !== nextAtomState) {
          recomputeDependents(a)
        }
      } else {
        r = writeAtomState(a as AnyWritableAtom, ...args) as R
      }
      if (!isSync) {
        flushPending()
      }
      return r as R
    }
    const result = atom.write(getter, setter, ...args)
    isSync = false
    return result
  }

  const writeAtom = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    const result = writeAtomState(atom, ...args)
    flushPending()
    return result
  }

  const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
    !!(atom as AnyWritableAtom).write

  const mountAtom = <Value>(
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
    const atomState = readAtomState(atom)
    atomState.d.forEach((_, a) => {
      const aMounted = mountedMap.get(a)
      if (aMounted) {
        aMounted.t.add(atom) // add dependent
      } else {
        if (a !== atom) {
          mountAtom(a, atom)
        }
      }
    })
    // onMount
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const onUnmount = atom.onMount((...args) => writeAtom(atom, ...args))
      if (onUnmount) {
        mounted.u = onUnmount
      }
    }
    return mounted
  }

  const unmountAtom = <Value>(atom: Atom<Value>): void => {
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
    const atomState = getAtomState(atom)
    if (atomState) {
      // cancel promise
      if ('v' in atomState && atomState.v instanceof Promise) {
        cancelPromise(atomState.v)
      }
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          const mounted = mountedMap.get(a)
          if (mounted) {
            mounted.t.delete(atom)
            if (canUnmountAtom(a, mounted)) {
              unmountAtom(a)
            }
          }
        }
      })
    } else if (__DEV__) {
      console.warn('[Bug] could not find atom state to unmount', atom)
    }
  }

  const mountDependencies = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>,
    prevDependencies?: Dependencies
  ): void => {
    const depSet = new Set(atomState.d.keys())
    prevDependencies?.forEach((_, a) => {
      if (depSet.has(a)) {
        // not changed
        depSet.delete(a)
        return
      }
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.delete(atom) // delete from dependents
        if (canUnmountAtom(a, mounted)) {
          unmountAtom(a)
        }
      }
    })
    depSet.forEach((a) => {
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.add(atom) // add to dependents
      } else if (mountedMap.has(atom)) {
        // we mount dependencies only when atom is already mounted
        // Note: we should revisit this when you find other issues
        // https://github.com/pmndrs/jotai/issues/942
        mountAtom(a, atom)
      }
    })
  }

  const flushPending = (): void => {
    while (pendingMap.size) {
      const pending = Array.from(pendingMap)
      pendingMap.clear()
      pending.forEach(([atom, prevAtomState]) => {
        const atomState = getAtomState(atom)
        if (atomState) {
          if (atomState.d !== prevAtomState?.d) {
            mountDependencies(atom, atomState, prevAtomState?.d)
          }
          const mounted = mountedMap.get(atom)
          mounted?.l.forEach((listener) => listener())
        } else if (__DEV__) {
          console.warn('[Bug] no atom state to flush')
        }
      })
    }
    if (__DEV__) {
      stateListeners.forEach((l) => l())
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const mounted = addAtom(atom)
    const listeners = mounted.l
    listeners.add(listener)
    flushPending()
    return () => {
      listeners.delete(listener)
      delAtom(atom)
    }
  }

  const restoreAtoms = (
    values: Iterable<readonly [AnyAtom, AnyValue]>
  ): void => {
    for (const [atom, value] of values) {
      if (hasInitialValue(atom)) {
        setAtomValue(atom, value)
        recomputeDependents(atom)
      }
    }
    flushPending()
  }

  if (__DEV__) {
    return {
      get: readAtom,
      set: writeAtom,
      sub: subscribeAtom,
      res: restoreAtoms,
      // store dev methods (these are tentative and subject to change)
      dev_subscribe_state: (l: StateListener) => {
        stateListeners.add(l)
        return () => {
          stateListeners.delete(l)
        }
      },
      dev_get_mounted_atoms: () => mountedAtoms.values(),
      dev_get_atom_state: (a: AnyAtom) => atomStateMap.get(a),
      dev_get_mounted: (a: AnyAtom) => mountedMap.get(a),
    }
  }
  return {
    /**
     * Read an atom's [AtomState], an internal data structure that is not considered
     * part of the public API. See [useAtom] for more details.
     *
     * Derived atom states may be recomputed if they are invalidated and any of
     * their transitive dependencies have changed.
     */
    get: readAtom,
    /**
     * Invoke an atom's [WritableAtom.write] method with an update value.
     * That `write` method may set one or more atoms.
     * The default `write` method of primitive atoms just sets the atom itself to
     * the update value.
     */
    set: writeAtom,
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
    sub: subscribeAtom,
    /**
     * Bulk-apply new values to atoms.
     */
    res: restoreAtoms,
  }
}

export type Store = ReturnType<typeof createStore>

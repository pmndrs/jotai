import type { Atom, WritableAtom } from './atom.ts'

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

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

type CancelPromise = (next?: Promise<unknown>) => void
const cancelPromiseMap = new WeakMap<Promise<unknown>, CancelPromise>()

const registerCancelPromise = (
  promise: Promise<unknown>,
  cancel: CancelPromise
) => {
  cancelPromiseMap.set(promise, cancel)
  promise.catch(() => {}).finally(() => cancelPromiseMap.delete(promise))
}

const cancelPromise = (promise: Promise<unknown>, next?: Promise<unknown>) => {
  const cancel = cancelPromiseMap.get(promise)
  if (cancel) {
    cancelPromiseMap.delete(promise)
    cancel(next)
  }
}

type PromiseMeta<T> = {
  status?: 'pending' | 'fulfilled' | 'rejected'
  value?: T
  reason?: AnyError
  orig?: PromiseLike<T>
}

const resolvePromise = <T>(promise: Promise<T> & PromiseMeta<T>, value: T) => {
  promise.status = 'fulfilled'
  promise.value = value
}

const rejectPromise = <T>(
  promise: Promise<T> & PromiseMeta<T>,
  e: AnyError
) => {
  promise.status = 'rejected'
  promise.reason = e
}

const isPromiseLike = (x: unknown): x is PromiseLike<unknown> =>
  typeof (x as any)?.then === 'function'

/**
 * Immutable map from a dependency to the dependency's atom state
 * when it was last read.
 * We can skip recomputation of an atom by comparing the atom state
 * of each dependency to that dependencies's current revision.
 */
type Dependencies = Map<AnyAtom, AtomState>
type NextDependencies = Map<AnyAtom, AtomState | undefined>

/**
 * Immutable atom state,
 * tracked for both mounted and unmounted atoms in a store.
 */
type AtomState<Value = AnyValue> = {
  d: Dependencies
} & ({ e: AnyError } | { v: Value })

const isEqualAtomValue = <Value>(a: AtomState<Value>, b: AtomState<Value>) =>
  'v' in a && 'v' in b && Object.is(a.v, b.v)

const isEqualAtomError = <Value>(a: AtomState<Value>, b: AtomState<Value>) =>
  'e' in a && 'e' in b && Object.is(a.e, b.e)

const hasPromiseAtomValue = <Value>(
  a: AtomState<Value>
): a is AtomState<Value> & { v: Value & Promise<unknown> } =>
  'v' in a && a.v instanceof Promise

const isEqualPromiseAtomValue = <Value>(
  a: AtomState<Promise<Value> & PromiseMeta<Value>>,
  b: AtomState<Promise<Value> & PromiseMeta<Value>>
) => 'v' in a && 'v' in b && a.v.orig && a.v.orig === b.v.orig

const returnAtomValue = <Value>(atomState: AtomState<Value>): Value => {
  if ('e' in atomState) {
    throw atomState.e
  }
  return atomState.v
}

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
type StoreListenerRev1 = (type: 'state' | 'sub' | 'unsub') => void
type StoreListenerRev2 = (
  action:
    | { type: 'write'; flushed: Set<AnyAtom> }
    | { type: 'async-write'; flushed: Set<AnyAtom> }
    | { type: 'sub'; flushed: Set<AnyAtom> }
    | { type: 'unsub' }
    | { type: 'restore'; flushed: Set<AnyAtom> }
) => void
type DevSubscribeStore = {
  /**
   * @deprecated use StoreListenerRev2
   */
  (listener: StoreListenerRev1): () => void
  (listener: StoreListenerRev2, rev: 2): () => void
}

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
 * @returns A store.
 */
export const createStore = () => {
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()
  const mountedMap = new WeakMap<AnyAtom, Mounted>()
  const pendingMap = new Map<
    AnyAtom,
    AtomState /* prevAtomState */ | undefined
  >()
  let storeListenersRev1: Set<StoreListenerRev1>
  let storeListenersRev2: Set<StoreListenerRev2>
  let mountedAtoms: MountedAtoms
  if (import.meta.env?.MODE !== 'production') {
    storeListenersRev1 = new Set()
    storeListenersRev2 = new Set()
    mountedAtoms = new Set()
  }

  const getAtomState = <Value>(atom: Atom<Value>) =>
    atomStateMap.get(atom) as AtomState<Value> | undefined

  const setAtomState = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>
  ): void => {
    if (import.meta.env?.MODE !== 'production') {
      Object.freeze(atomState)
    }
    const prevAtomState = atomStateMap.get(atom)
    atomStateMap.set(atom, atomState)
    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevAtomState)
    }
    if (prevAtomState && hasPromiseAtomValue(prevAtomState)) {
      const next =
        'v' in atomState
          ? atomState.v instanceof Promise
            ? atomState.v
            : Promise.resolve(atomState.v)
          : Promise.reject(atomState.e)
      cancelPromise(prevAtomState.v, next)
    }
  }

  const updateDependencies = <Value>(
    atom: Atom<Value>,
    nextAtomState: AtomState<Value>,
    nextDependencies: NextDependencies
  ): void => {
    const dependencies: Dependencies = new Map()
    let changed = false
    nextDependencies.forEach((aState, a) => {
      if (!aState && a === atom) {
        aState = nextAtomState
      }
      if (aState) {
        dependencies.set(a, aState)
        if (nextAtomState.d.get(a) !== aState) {
          changed = true
        }
      } else if (import.meta.env?.MODE !== 'production') {
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
    nextDependencies?: NextDependencies
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      v: value,
    }
    if (nextDependencies) {
      updateDependencies(atom, nextAtomState, nextDependencies)
    }
    if (
      prevAtomState &&
      isEqualAtomValue(prevAtomState, nextAtomState) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // bail out
      return prevAtomState
    }
    if (
      prevAtomState &&
      hasPromiseAtomValue(prevAtomState) &&
      hasPromiseAtomValue(nextAtomState) &&
      isEqualPromiseAtomValue(prevAtomState, nextAtomState)
    ) {
      if (prevAtomState.d === nextAtomState.d) {
        // bail out
        return prevAtomState
      } else {
        // restore the wrapped promise
        nextAtomState.v = prevAtomState.v
      }
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const setAtomValueOrPromise = <Value>(
    atom: Atom<Value>,
    valueOrPromise: Value,
    nextDependencies?: NextDependencies,
    abortPromise?: () => void
  ): AtomState<Value> => {
    if (isPromiseLike(valueOrPromise)) {
      let continuePromise: (next: Promise<Awaited<Value>>) => void
      const promise: Promise<Awaited<Value>> & PromiseMeta<Awaited<Value>> =
        new Promise((resolve, reject) => {
          let settled = false
          valueOrPromise.then(
            (v) => {
              if (!settled) {
                settled = true
                const prevAtomState = getAtomState(atom)
                // update dependencies, that could have changed
                const nextAtomState = setAtomValue(
                  atom,
                  promise as Value,
                  nextDependencies
                )
                resolvePromise(promise, v)
                resolve(v as Awaited<Value>)
                if (prevAtomState?.d !== nextAtomState.d) {
                  mountDependencies(atom, nextAtomState, prevAtomState?.d)
                }
              }
            },
            (e) => {
              if (!settled) {
                settled = true
                const prevAtomState = getAtomState(atom)
                // update dependencies, that could have changed
                const nextAtomState = setAtomValue(
                  atom,
                  promise as Value,
                  nextDependencies
                )
                rejectPromise(promise, e)
                reject(e)
                if (prevAtomState?.d !== nextAtomState.d) {
                  mountDependencies(atom, nextAtomState, prevAtomState?.d)
                }
              }
            }
          )
          continuePromise = (next) => {
            if (!settled) {
              settled = true
              next.then(
                (v) => resolvePromise(promise, v),
                (e) => rejectPromise(promise, e)
              )
              resolve(next)
            }
          }
        })
      promise.orig = valueOrPromise as PromiseLike<Awaited<Value>>
      promise.status = 'pending'
      registerCancelPromise(promise, (next) => {
        if (next) {
          continuePromise(next as Promise<Awaited<Value>>)
        }
        abortPromise?.()
      })
      return setAtomValue(atom, promise as Value, nextDependencies)
    }
    return setAtomValue(atom, valueOrPromise, nextDependencies)
  }

  const setAtomError = <Value>(
    atom: Atom<Value>,
    error: AnyError,
    nextDependencies?: NextDependencies
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      e: error,
    }
    if (nextDependencies) {
      updateDependencies(atom, nextAtomState, nextDependencies)
    }
    if (
      prevAtomState &&
      isEqualAtomError(prevAtomState, nextAtomState) &&
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
      // Recursive calls to `readAtomState(a)` will recompute `a` if
      // it's out of date thus increment its revision number if it changes.
      atomState.d.forEach((_, a) => {
        if (a !== atom && !mountedMap.has(a)) {
          // Dependency is new or unmounted.
          // Recomputing doesn't touch unmounted atoms, so we need to recurse
          // into this dependency in case it needs to update.
          readAtomState(a)
        }
      })
      // If a dependency changed since this atom was last computed,
      // then we're out of date and need to recompute.
      if (
        Array.from(atomState.d).every(([a, s]) => {
          const aState = getAtomState(a)
          return (
            a === atom ||
            aState === s ||
            // TODO This is a hack, we should find a better solution.
            (aState &&
              !hasPromiseAtomValue(aState) &&
              isEqualAtomValue(aState, s))
          )
        })
      ) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    const nextDependencies: NextDependencies = new Map()
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if ((a as AnyAtom) === atom) {
        const aState = getAtomState(a)
        if (aState) {
          nextDependencies.set(a, aState)
          return returnAtomValue(aState)
        }
        if (hasInitialValue(a)) {
          nextDependencies.set(a, undefined)
          return a.init
        }
        // NOTE invalid derived atoms can reach here
        throw new Error('no atom init')
      }
      // a !== atom
      const aState = readAtomState(a)
      nextDependencies.set(a, aState)
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
      return setAtomValueOrPromise(atom, valueOrPromise, nextDependencies, () =>
        controller?.abort()
      )
    } catch (error) {
      return setAtomError(atom, error, nextDependencies)
    } finally {
      isSync = false
    }
  }

  const readAtom = <Value>(atom: Atom<Value>): Value =>
    returnAtomValue(readAtomState(atom))

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

  const recomputeDependents = (atom: AnyAtom): void => {
    const dependencyMap = new Map<AnyAtom, Set<AnyAtom>>()
    const dirtyMap = new WeakMap<AnyAtom, number>()
    const loop1 = (a: AnyAtom) => {
      const mounted = mountedMap.get(a)
      mounted?.t.forEach((dependent) => {
        if (dependent !== a) {
          dependencyMap.set(
            dependent,
            (dependencyMap.get(dependent) || new Set()).add(a)
          )
          dirtyMap.set(dependent, (dirtyMap.get(dependent) || 0) + 1)
          loop1(dependent)
        }
      })
    }
    loop1(atom)
    const loop2 = (a: AnyAtom) => {
      const mounted = mountedMap.get(a)
      mounted?.t.forEach((dependent) => {
        if (dependent !== a) {
          let dirtyCount = dirtyMap.get(dependent)
          if (dirtyCount) {
            dirtyMap.set(dependent, --dirtyCount)
          }
          if (!dirtyCount) {
            let isChanged = !!dependencyMap.get(dependent)?.size
            if (isChanged) {
              const prevAtomState = getAtomState(dependent)
              const nextAtomState = readAtomState(dependent)
              isChanged =
                !prevAtomState ||
                !isEqualAtomValue(prevAtomState, nextAtomState)
            }
            if (!isChanged) {
              dependencyMap.forEach((s) => s.delete(dependent))
            }
          }
          loop2(dependent)
        }
      })
    }
    loop2(atom)
  }

  const writeAtomState = <Value, Args extends unknown[], Result>(
    atom: WritableAtom<Value, Args, Result>,
    ...args: Args
  ): Result => {
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => returnAtomValue(readAtomState(a))
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
        const nextAtomState = setAtomValueOrPromise(a, args[0] as V)
        if (!prevAtomState || !isEqualAtomValue(prevAtomState, nextAtomState)) {
          recomputeDependents(a)
        }
      } else {
        r = writeAtomState(a as AnyWritableAtom, ...args) as R
      }
      if (!isSync) {
        const flushed = flushPending()
        if (import.meta.env?.MODE !== 'production') {
          storeListenersRev2.forEach((l) =>
            l({ type: 'async-write', flushed: flushed as Set<AnyAtom> })
          )
        }
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
    const flushed = flushPending()
    if (import.meta.env?.MODE !== 'production') {
      storeListenersRev2.forEach((l) =>
        l({ type: 'write', flushed: flushed as Set<AnyAtom> })
      )
    }
    return result
  }

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
    if (import.meta.env?.MODE !== 'production') {
      mountedAtoms.add(atom)
    }
    // mount dependencies before onMount
    readAtomState(atom).d.forEach((_, a) => {
      const aMounted = mountedMap.get(a)
      if (aMounted) {
        aMounted.t.add(atom) // add dependent
      } else {
        if (a !== atom) {
          mountAtom(a, atom)
        }
      }
    })
    // recompute atom state
    readAtomState(atom)
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
    if (import.meta.env?.MODE !== 'production') {
      mountedAtoms.delete(atom)
    }
    // unmount dependencies afterward
    const atomState = getAtomState(atom)
    if (atomState) {
      // cancel promise
      if (hasPromiseAtomValue(atomState)) {
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
    } else if (import.meta.env?.MODE !== 'production') {
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

  const flushPending = (): void | Set<AnyAtom> => {
    let flushed: Set<AnyAtom>
    if (import.meta.env?.MODE !== 'production') {
      flushed = new Set()
    }
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
          if (
            mounted &&
            !(
              // TODO This seems pretty hacky. Hope to fix it.
              // Maybe we could `mountDependencies` in `setAtomState`?
              (
                prevAtomState &&
                !hasPromiseAtomValue(prevAtomState) &&
                (isEqualAtomValue(prevAtomState, atomState) ||
                  isEqualAtomError(prevAtomState, atomState))
              )
            )
          ) {
            mounted.l.forEach((listener) => listener())
            if (import.meta.env?.MODE !== 'production') {
              flushed.add(atom)
            }
          }
        } else if (import.meta.env?.MODE !== 'production') {
          console.warn('[Bug] no atom state to flush')
        }
      })
    }
    if (import.meta.env?.MODE !== 'production') {
      storeListenersRev1.forEach((l) => l('state'))
      // @ts-expect-error Variable 'flushed' is used before being assigned.
      return flushed
    }
  }

  const subscribeAtom = (atom: AnyAtom, listener: () => void) => {
    const mounted = addAtom(atom)
    const flushed = flushPending()
    const listeners = mounted.l
    listeners.add(listener)
    if (import.meta.env?.MODE !== 'production') {
      storeListenersRev1.forEach((l) => l('sub'))
      storeListenersRev2.forEach((l) =>
        l({ type: 'sub', flushed: flushed as Set<AnyAtom> })
      )
    }
    return () => {
      listeners.delete(listener)
      delAtom(atom)
      if (import.meta.env?.MODE !== 'production') {
        // devtools uses this to detect if it _can_ unmount or not
        storeListenersRev1.forEach((l) => l('unsub'))
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
      dev_subscribe_store: ((l: StoreListenerRev1 | StoreListenerRev2, rev) => {
        if (rev !== 2) {
          console.warn(
            'The current StoreListener revision is 2. The older ones are deprecated.'
          )
          storeListenersRev1.add(l as StoreListenerRev1)
          return () => {
            storeListenersRev1.delete(l as StoreListenerRev1)
          }
        }
        storeListenersRev2.add(l as StoreListenerRev2)
        return () => {
          storeListenersRev2.delete(l as StoreListenerRev2)
        }
      }) as DevSubscribeStore,
      dev_get_mounted_atoms: () => mountedAtoms.values(),
      dev_get_atom_state: (a: AnyAtom) => atomStateMap.get(a),
      dev_get_mounted: (a: AnyAtom) => mountedMap.get(a),
      dev_restore_atoms: (values: Iterable<readonly [AnyAtom, AnyValue]>) => {
        for (const [atom, valueOrPromise] of values) {
          if (hasInitialValue(atom)) {
            setAtomValueOrPromise(atom, valueOrPromise)
            recomputeDependents(atom)
          }
        }
        const flushed = flushPending()
        storeListenersRev2.forEach((l) =>
          l({ type: 'restore', flushed: flushed as Set<AnyAtom> })
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

type Store = ReturnType<typeof createStore>

let defaultStore: Store | undefined

export const getDefaultStore = () => {
  if (!defaultStore) {
    defaultStore = createStore()
  }
  return defaultStore
}

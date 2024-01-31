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

type CancelPromise = (next?: Promise<unknown>) => void
const cancelPromiseMap = new WeakMap<Promise<unknown>, CancelPromise>()

const registerCancelPromise = (
  promise: Promise<unknown>,
  cancel: CancelPromise,
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
  e: AnyError,
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

const isEqualAtomValue = <Value>(
  a: AtomState<Value> | undefined,
  b: AtomState<Value>,
): a is AtomState<Value> => !!a && 'v' in a && 'v' in b && Object.is(a.v, b.v)

const isEqualAtomError = <Value>(
  a: AtomState<Value> | undefined,
  b: AtomState<Value>,
): a is AtomState<Value> => !!a && 'e' in a && 'e' in b && Object.is(a.e, b.e)

const hasPromiseAtomValue = <Value>(
  a: AtomState<Value> | undefined,
): a is AtomState<Value> & { v: Value & Promise<unknown> } =>
  !!a && 'v' in a && a.v instanceof Promise

const isEqualPromiseAtomValue = <Value>(
  a: AtomState<Promise<Value> & PromiseMeta<Value>>,
  b: AtomState<Promise<Value> & PromiseMeta<Value>>,
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
type StoreListenerRev2 = (
  action:
    | { type: 'write'; flushed: Set<AnyAtom> }
    | { type: 'async-write'; flushed: Set<AnyAtom> }
    | { type: 'sub'; flushed: Set<AnyAtom> }
    | { type: 'unsub' }
    | { type: 'restore'; flushed: Set<AnyAtom> },
) => void

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
  let storeListenersRev2: Set<StoreListenerRev2>
  let mountedAtoms: MountedAtoms
  if (import.meta.env?.MODE !== 'production') {
    storeListenersRev2 = new Set()
    mountedAtoms = new Set()
  }

  const getAtomState = <Value>(atom: Atom<Value>) =>
    atomStateMap.get(atom) as AtomState<Value> | undefined

  const setAtomState = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>,
  ): void => {
    if (import.meta.env?.MODE !== 'production') {
      Object.freeze(atomState)
    }
    const prevAtomState = atomStateMap.get(atom)
    atomStateMap.set(atom, atomState)
    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevAtomState)
    }
    if (hasPromiseAtomValue(prevAtomState)) {
      const next =
        'v' in atomState
          ? atomState.v instanceof Promise
            ? atomState.v
            : Promise.resolve(atomState.v)
          : Promise.reject(atomState.e)
      if (prevAtomState.v !== next) {
        cancelPromise(prevAtomState.v, next)
      }
    }
  }

  const updateDependencies = <Value>(
    atom: Atom<Value>,
    nextAtomState: AtomState<Value>,
    nextDependencies: NextDependencies,
    keepPreviousDependencies?: boolean,
  ): void => {
    const dependencies: Dependencies = new Map(
      keepPreviousDependencies ? nextAtomState.d : null,
    )
    let changed = false
    nextDependencies.forEach((aState, a) => {
      if (!aState && isSelfAtom(atom, a)) {
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
    nextDependencies?: NextDependencies,
    keepPreviousDependencies?: boolean,
  ): AtomState<Value> => {
    const prevAtomState = getAtomState(atom)
    const nextAtomState: AtomState<Value> = {
      d: prevAtomState?.d || new Map(),
      v: value,
    }
    if (nextDependencies) {
      updateDependencies(
        atom,
        nextAtomState,
        nextDependencies,
        keepPreviousDependencies,
      )
    }
    if (
      isEqualAtomValue(prevAtomState, nextAtomState) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // bail out
      return prevAtomState
    }
    if (
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
    abortPromise?: () => void,
  ): AtomState<Value> => {
    if (isPromiseLike(valueOrPromise)) {
      let continuePromise: (next: Promise<Awaited<Value>>) => void
      const updatePromiseDependencies = () => {
        const prevAtomState = getAtomState(atom)
        if (
          !hasPromiseAtomValue(prevAtomState) ||
          prevAtomState.v !== promise
        ) {
          // not the latest promise
          return
        }
        // update dependencies, that could have changed
        const nextAtomState = setAtomValue(
          atom,
          promise as Value,
          nextDependencies,
        )
        if (mountedMap.has(atom) && prevAtomState.d !== nextAtomState.d) {
          mountDependencies(atom, nextAtomState, prevAtomState.d)
        }
      }
      const promise: Promise<Awaited<Value>> & PromiseMeta<Awaited<Value>> =
        new Promise((resolve, reject) => {
          let settled = false
          valueOrPromise.then(
            (v) => {
              if (!settled) {
                settled = true
                resolvePromise(promise, v)
                resolve(v as Awaited<Value>)
                updatePromiseDependencies()
              }
            },
            (e) => {
              if (!settled) {
                settled = true
                rejectPromise(promise, e)
                reject(e)
                updatePromiseDependencies()
              }
            },
          )
          continuePromise = (next) => {
            if (!settled) {
              settled = true
              next.then(
                (v) => resolvePromise(promise, v),
                (e) => rejectPromise(promise, e),
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
      return setAtomValue(atom, promise as Value, nextDependencies, true)
    }
    return setAtomValue(atom, valueOrPromise, nextDependencies)
  }

  const setAtomError = <Value>(
    atom: Atom<Value>,
    error: AnyError,
    nextDependencies?: NextDependencies,
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
      isEqualAtomError(prevAtomState, nextAtomState) &&
      prevAtomState.d === nextAtomState.d
    ) {
      // bail out
      return prevAtomState
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const readAtomState = <Value>(
    atom: Atom<Value>,
    force?: boolean,
  ): AtomState<Value> => {
    // See if we can skip recomputing this atom.
    const atomState = getAtomState(atom)
    if (!force && atomState) {
      // If the atom is mounted, we can use the cache.
      // because it should have been updated by dependencies.
      if (mountedMap.has(atom)) {
        return atomState
      }
      // Otherwise, check if the dependencies have changed.
      // If all dependencies haven't changed, we can use the cache.
      if (
        Array.from(atomState.d).every(([a, s]) => {
          if (isSelfAtom(atom, a)) {
            return true
          }
          const aState = readAtomState(a)
          // Check if the atom state is unchanged, or
          // check the atom value in case only dependencies are changed
          return aState === s || isEqualAtomValue(aState, s)
        })
      ) {
        return atomState
      }
    }
    // Compute a new state for this atom.
    const nextDependencies: NextDependencies = new Map()
    let isSync = true
    const getter: Getter = <V>(a: Atom<V>) => {
      if (isSelfAtom(atom, a)) {
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
        controller?.abort(),
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
    const getDependents = (a: AnyAtom): Dependents => {
      const dependents = new Set(mountedMap.get(a)?.t)
      pendingMap.forEach((_, pendingAtom) => {
        if (getAtomState(pendingAtom)?.d.has(a)) {
          dependents.add(pendingAtom)
        }
      })
      return dependents
    }

    // This is a topological sort via depth-first search, slightly modified from
    // what's described here for simplicity and performance reasons:
    // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search

    // Step 1: traverse the dependency graph to build the topsorted atom list
    // We don't bother to check for cycles, which simplifies the algorithm.
    const topsortedAtoms = new Array<AnyAtom>()
    const markedAtoms = new Set<AnyAtom>()
    const visit = (n: AnyAtom) => {
      if (markedAtoms.has(n)) {
        return
      }
      markedAtoms.add(n)
      for (const m of getDependents(n)) {
        if (!isSelfAtom(n, m)) {
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
      const prevAtomState = getAtomState(a)
      if (!prevAtomState) {
        continue
      }
      let hasChangedDeps = false
      for (const dep of prevAtomState.d.keys()) {
        if (dep !== a && changedAtoms.has(dep)) {
          hasChangedDeps = true
          break
        }
      }
      if (hasChangedDeps) {
        const nextAtomState = readAtomState(a, true)
        if (!isEqualAtomValue(prevAtomState, nextAtomState)) {
          changedAtoms.add(a)
        }
      }
    }
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
      if (isSelfAtom(atom, a)) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('atom not writable')
        }
        const prevAtomState = getAtomState(a)
        const nextAtomState = setAtomValueOrPromise(a, args[0] as V)
        if (!isEqualAtomValue(prevAtomState, nextAtomState)) {
          recomputeDependents(a)
        }
      } else {
        r = writeAtomState(a as AnyWritableAtom, ...args) as R
      }
      if (!isSync) {
        const flushed = flushPending()
        if (import.meta.env?.MODE !== 'production') {
          storeListenersRev2.forEach((l) =>
            l({ type: 'async-write', flushed: flushed as Set<AnyAtom> }),
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
        l({ type: 'write', flushed: flushed as Set<AnyAtom> }),
      )
    }
    return result
  }

  const mountAtom = <Value>(
    atom: Atom<Value>,
    initialDependent?: AnyAtom,
    onMountQueue?: (() => void)[],
  ): Mounted => {
    const queue = onMountQueue || []
    // mount dependencies before mounting self
    getAtomState(atom)?.d.forEach((_, a) => {
      const aMounted = mountedMap.get(a)
      if (aMounted) {
        aMounted.t.add(atom) // add dependent
      } else {
        if (a !== atom) {
          mountAtom(a, atom, queue)
        }
      }
    })
    // recompute atom state
    readAtomState(atom)
    // mount self
    const mounted: Mounted = {
      t: new Set(initialDependent && [initialDependent]),
      l: new Set(),
    }
    mountedMap.set(atom, mounted)
    if (import.meta.env?.MODE !== 'production') {
      mountedAtoms.add(atom)
    }
    // onMount
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const { onMount } = atom
      queue.push(() => {
        const onUnmount = onMount((...args) => writeAtom(atom, ...args))
        if (onUnmount) {
          mounted.u = onUnmount
        }
      })
    }
    if (!onMountQueue) {
      queue.forEach((f) => f())
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
    prevDependencies?: Dependencies,
  ): void => {
    const depSet = new Set(atomState.d.keys())
    const maybeUnmountAtomSet = new Set<AnyAtom>()
    prevDependencies?.forEach((_, a) => {
      if (depSet.has(a)) {
        // not changed
        depSet.delete(a)
        return
      }
      maybeUnmountAtomSet.add(a)
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.t.delete(atom) // delete from dependents
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
    maybeUnmountAtomSet.forEach((a) => {
      const mounted = mountedMap.get(a)
      if (mounted && canUnmountAtom(a, mounted)) {
        unmountAtom(a)
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
          const mounted = mountedMap.get(atom)
          if (mounted && atomState.d !== prevAtomState?.d) {
            mountDependencies(atom, atomState, prevAtomState?.d)
          }
          if (
            mounted &&
            !(
              // TODO This seems pretty hacky. Hope to fix it.
              // Maybe we could `mountDependencies` in `setAtomState`?
              (
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
      storeListenersRev2.forEach((l) =>
        l({ type: 'sub', flushed: flushed as Set<AnyAtom> }),
      )
    }
    return () => {
      listeners.delete(listener)
      delAtom(atom)
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
          l({ type: 'restore', flushed: flushed as Set<AnyAtom> }),
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

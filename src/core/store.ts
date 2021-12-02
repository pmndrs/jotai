import type { Atom, WritableAtom } from './atom'

type ResolveType<T> = T extends Promise<infer V> ? V : T

type AnyAtom = Atom<unknown>
type AnyWritableAtom = WritableAtom<unknown, unknown, void | Promise<void>>
type OnUnmount = () => void
type WriteGetter = Parameters<WritableAtom<unknown, unknown>['write']>[0]
type Setter = Parameters<WritableAtom<unknown, unknown>['write']>[1]

const hasInitialValue = <T extends Atom<unknown>>(
  atom: T
): atom is T & (T extends Atom<infer Value> ? { init: Value } : never) =>
  'init' in atom

const IS_EQUAL_PROMISE = Symbol()
const INTERRUPT_PROMISE = Symbol()
type InterruptablePromise = Promise<void> & {
  [IS_EQUAL_PROMISE]: (p: Promise<void>) => boolean
  [INTERRUPT_PROMISE]: (() => void) | undefined // defined if interruptable
}

const isInterruptablePromise = (
  promise: Promise<void>
): promise is InterruptablePromise =>
  !!(promise as InterruptablePromise)[IS_EQUAL_PROMISE]

const createInterruptablePromise = (
  promise: Promise<void>
): InterruptablePromise => {
  let interrupt: (() => void) | undefined
  const interruptablePromise = new Promise<void>((resolve, reject) => {
    interrupt = () => {
      interruptablePromise[INTERRUPT_PROMISE] = undefined
      resolve()
    }
    promise.then(interrupt, reject)
  }) as InterruptablePromise
  interruptablePromise[IS_EQUAL_PROMISE] = (p: Promise<void>): boolean =>
    interruptablePromise === p ||
    promise === p ||
    (isInterruptablePromise(promise) && promise[IS_EQUAL_PROMISE](p))
  interruptablePromise[INTERRUPT_PROMISE] = interrupt
  return interruptablePromise
}

type RevisionForValue = number
type RevisionForUpdate = number
type InvalidatedRevision = number
type ReadDependencies = Map<AnyAtom, RevisionForValue>

// immutable atom state
export type AtomState<Value = unknown> = {
  e?: unknown // read error
  p?: InterruptablePromise // read promise
  c?: (() => void) | undefined // cancel read promise
  v?: ResolveType<Value>
  r: RevisionForValue
  u: RevisionForUpdate
  i?: InvalidatedRevision
  d: ReadDependencies
}

export type VersionObject = { p?: VersionObject }

type Listeners = Set<(version?: VersionObject) => void>
type Dependents = Set<AnyAtom>
type Mounted = {
  l: Listeners
  d: Dependents
  u?: OnUnmount
}

// for debugging purpose only
type StateListener = (updatedAtom: AnyAtom, isNewAtom: boolean) => void
type MountedAtoms = Set<AnyAtom>

// store methods
export const READ_ATOM = 'r'
export const WRITE_ATOM = 'w'
export const COMMIT_ATOM = 'c'
export const SUBSCRIBE_ATOM = 's'
export const RESTORE_ATOMS = 'h'

// store dev methods (these are tentative and subject to change)
export const DEV_SUBSCRIBE_STATE = 'n'
export const DEV_GET_MOUNTED_ATOMS = 'l'
export const DEV_GET_ATOM_STATE = 'a'
export const DEV_GET_MOUNTED = 'm'

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
) => {
  const committedAtomStateMap = new WeakMap<AnyAtom, AtomState>()
  const mountedMap = new WeakMap<AnyAtom, Mounted>()
  const pendingMap = new Map<
    AnyAtom,
    AtomState /* prevAtomState */ | undefined
  >()
  let stateListeners: Set<StateListener>
  let mountedAtoms: MountedAtoms
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    stateListeners = new Set()
    mountedAtoms = new Set()
  }

  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState: AtomState = { v: value, r: 0, u: 0, d: new Map() }
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
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
          if (atomState.p) {
            atomState.p.then(() => {
              const nextAtomState = getAtomState(version.p, atom)
              if (nextAtomState) {
                versionedAtomStateMap.set(atom, nextAtomState)
              }
            })
          }
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
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      Object.freeze(atomState)
    }
    if (version) {
      const versionedAtomStateMap = getVersionedAtomStateMap(version)
      versionedAtomStateMap.set(atom, atomState)
    } else {
      const prevAtomState = committedAtomStateMap.get(atom)
      committedAtomStateMap.set(atom, atomState)
      if (!pendingMap.has(atom)) {
        pendingMap.set(atom, prevAtomState)
      }
    }
  }

  const prepareNextAtomState = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    dependencies?: Set<AnyAtom>
  ): AtomState<Value> => {
    const atomState = getAtomState(version, atom)
    const nextAtomState = {
      r: 0,
      u: 0,
      ...atomState,
      d: dependencies
        ? new Map(
            Array.from(dependencies).map((a) => [
              a,
              getAtomState(version, a)?.r ?? 0,
            ])
          )
        : atomState?.d || new Map(),
    }
    return nextAtomState
  }

  const setAtomValue = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    value: ResolveType<Value>,
    dependencies?: Set<AnyAtom>,
    promise?: Promise<void>
  ): void => {
    const atomState = prepareNextAtomState(version, atom, dependencies)
    if (promise && !atomState.p?.[IS_EQUAL_PROMISE](promise)) {
      // newer async read is running, not updating
      return
    }
    atomState.c?.() // cancel read promise
    if (
      'e' in atomState || // has read error, or
      atomState.p || // has read promise, or
      !('v' in atomState) || // new value, or
      !Object.is(atomState.v, value) // different value
    ) {
      ++atomState.r // increment revision for value
      if (atomState.d.has(atom)) {
        atomState.d.set(atom, atomState.r)
      }
    }
    ++atomState.u // increment revision for update
    atomState.v = value // set value anyway
    delete atomState.e // clear read error
    delete atomState.p // clear read promise
    delete atomState.c // clear cancel read promise
    delete atomState.i // clear invalidated revision
    setAtomState(version, atom, atomState)
  }

  const setAtomReadError = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    error: unknown,
    dependencies?: Set<AnyAtom>,
    promise?: Promise<void>
  ): void => {
    const atomState = prepareNextAtomState(version, atom, dependencies)
    if (promise && !atomState.p?.[IS_EQUAL_PROMISE](promise)) {
      // newer async read is running, not updating
      return
    }
    atomState.c?.() // cancel read promise
    delete atomState.p // clear read promise
    delete atomState.c // clear cancel read promise
    delete atomState.i // clear invalidated revision
    atomState.e = error // set read error
    setAtomState(version, atom, atomState)
  }

  const setAtomReadPromise = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    promise: Promise<void>,
    dependencies?: Set<AnyAtom>
  ): void => {
    const atomState = prepareNextAtomState(version, atom, dependencies)
    if (atomState.p?.[IS_EQUAL_PROMISE](promise)) {
      // the same promise, not updating
      return
    }
    atomState.c?.() // cancel read promise
    delete atomState.e // clear read error
    const interruptablePromise = createInterruptablePromise(promise)
    atomState.p = interruptablePromise // set read promise
    atomState.c = interruptablePromise[INTERRUPT_PROMISE]
    delete atomState.i // clear invalidated revision
    setAtomState(version, atom, atomState)
  }

  const setAtomInvalidated = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): void => {
    const atomState = prepareNextAtomState(version, atom)
    atomState.i = atomState.r // set invalidated revision
    setAtomState(version, atom, atomState)
  }

  const readAtomState = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>,
    force?: boolean
  ): AtomState<Value> => {
    if (!force) {
      const atomState = getAtomState(version, atom)
      if (atomState) {
        atomState.d.forEach((_, a) => {
          if (a !== atom) {
            if (!mountedMap.has(a)) {
              // not mounted
              readAtomState(version, a)
            } else {
              const aState = getAtomState(version, a)
              if (
                aState &&
                aState.r === aState.i // revision is invalidated
              ) {
                readAtomState(version, a, true)
              }
            }
          }
        })
        if (
          Array.from(atomState.d.entries()).every(([a, r]) => {
            const aState = getAtomState(version, a)
            return (
              aState &&
              !('e' in aState) && // no read error
              !aState.p && // no read promise
              aState.r !== aState.i && // revision is not invalidated
              aState.r === r // revision is equal to the last one
            )
          })
        ) {
          return atomState
        }
      }
    }
    let error: unknown | undefined
    let promise: Promise<void> | undefined
    let value: ResolveType<Value> | undefined
    const dependencies = new Set<AnyAtom>()
    try {
      const promiseOrValue = atom.read(<V>(a: Atom<V>) => {
        dependencies.add(a)
        const aState =
          (a as AnyAtom) === atom
            ? getAtomState(version, a)
            : readAtomState(version, a)
        if (aState) {
          if ('e' in aState) {
            throw aState.e // read error
          }
          if (aState.p) {
            throw aState.p // read promise
          }
          return aState.v as ResolveType<V> // value
        }
        if (hasInitialValue(a)) {
          return a.init
        }
        // NOTE invalid derived atoms can reach here
        throw new Error('no atom init')
      })
      if (promiseOrValue instanceof Promise) {
        promise = promiseOrValue
          .then((value) => {
            setAtomValue(
              version,
              atom,
              value as ResolveType<Value>,
              dependencies,
              promise as Promise<void>
            )
            flushPending(version)
          })
          .catch((e) => {
            if (e instanceof Promise) {
              if (!isInterruptablePromise(e) || !e[INTERRUPT_PROMISE]) {
                // schedule another read later
                e.finally(() => readAtomState(version, atom, true))
              }
              return e
            }
            setAtomReadError(
              version,
              atom,
              e,
              dependencies,
              promise as Promise<void>
            )
            flushPending(version)
          })
      } else {
        value = promiseOrValue as ResolveType<Value>
      }
    } catch (errorOrPromise) {
      if (errorOrPromise instanceof Promise) {
        promise = errorOrPromise
      } else {
        error = errorOrPromise
      }
    }
    if (error) {
      setAtomReadError(version, atom, error, dependencies)
    } else if (promise) {
      setAtomReadPromise(version, atom, promise, dependencies)
    } else {
      setAtomValue(version, atom, value as ResolveType<Value>, dependencies)
    }
    return getAtomState(version, atom) as AtomState<Value>
  }

  const readAtom = <Value>(
    readingAtom: Atom<Value>,
    version?: VersionObject
  ): AtomState<Value> => {
    const atomState = readAtomState(version, readingAtom)
    return atomState
  }

  const addAtom = (addingAtom: AnyAtom): Mounted => {
    let mounted = mountedMap.get(addingAtom)
    if (!mounted) {
      mounted = mountAtom(addingAtom)
    }
    return mounted
  }

  // FIXME doesn't work with mutally dependent atoms
  const canUnmountAtom = (atom: AnyAtom, mounted: Mounted) =>
    !mounted.l.size &&
    (!mounted.d.size || (mounted.d.size === 1 && mounted.d.has(atom)))

  const delAtom = (deletingAtom: AnyAtom): void => {
    const mounted = mountedMap.get(deletingAtom)
    if (mounted && canUnmountAtom(deletingAtom, mounted)) {
      unmountAtom(deletingAtom)
    }
  }

  const invalidateDependents = <Value>(
    version: VersionObject | undefined,
    atom: Atom<Value>
  ): void => {
    const mounted = mountedMap.get(atom)
    mounted?.d.forEach((dependent) => {
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
  ): void | Promise<void> => {
    let isSync = true
    const writeGetter: WriteGetter = <V>(
      a: Atom<V>,
      options?: {
        unstable_promise: boolean
      }
    ) => {
      if (typeof options === 'boolean') {
        console.warn('[DEPRECATED] Please use { unstable_promise: true }')
        options = { unstable_promise: options }
      }
      const aState = readAtomState(version, a)
      if ('e' in aState) {
        throw aState.e // read error
      }
      if (aState.p) {
        if (options?.unstable_promise) {
          return aState.p.then(() =>
            writeGetter(a as unknown as Atom<Promise<unknown>>, options as any)
          ) as Promise<ResolveType<V>> // FIXME proper typing
        }
        if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.info(
            'Reading pending atom state in write operation. We throw a promise for now.',
            a
          )
        }
        throw aState.p // read promise
      }
      if ('v' in aState) {
        return aState.v as ResolveType<V> // value
      }
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn(
          '[Bug] no value found while reading atom in write operation. This is probably a bug.',
          a
        )
      }
      throw new Error('no value found')
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
        if (v instanceof Promise) {
          // TODO revisit if we can simply store the promise
          promiseOrVoid = v
            .then((resolvedValue) => {
              setAtomValue(version, a, resolvedValue)
              invalidateDependents(version, a)
              flushPending(version)
            })
            .catch((e) => {
              setAtomReadError(version, atom, e)
              flushPending(version)
            })
          setAtomReadPromise(version, atom, promiseOrVoid)
        } else {
          setAtomValue(version, a, v as ResolveType<V>)
        }
        invalidateDependents(version, a)
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
    version = undefined
    return promiseOrVoid
  }

  const writeAtom = <Value, Update, Result extends void | Promise<void>>(
    writingAtom: WritableAtom<Value, Update, Result>,
    update: Update,
    version?: VersionObject
  ): void | Promise<void> => {
    const promiseOrVoid = writeAtomState(version, writingAtom, update)
    flushPending(version)
    return promiseOrVoid
  }

  const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
    !!(atom as AnyWritableAtom).write

  const mountAtom = <Value>(
    atom: Atom<Value>,
    initialDependent?: AnyAtom
  ): Mounted => {
    // mount self
    const mounted: Mounted = {
      d: new Set(initialDependent && [initialDependent]),
      l: new Set(),
    }
    mountedMap.set(atom, mounted)
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      mountedAtoms.add(atom)
    }
    // mount read dependencies before onMount
    const atomState = readAtomState(undefined, atom)
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const aMounted = mountedMap.get(a)
        if (aMounted) {
          aMounted.d.add(atom) // add dependent
        } else {
          mountAtom(a, atom)
        }
      }
    })
    // onMount
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const setAtom = (update: unknown) => writeAtom(atom, update)
      const onUnmount = atom.onMount(setAtom)
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
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      mountedAtoms.delete(atom)
    }
    // unmount read dependencies afterward
    const atomState = getAtomState(undefined, atom)
    if (atomState) {
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          const mounted = mountedMap.get(a)
          if (mounted) {
            mounted.d.delete(atom)
            if (canUnmountAtom(a, mounted)) {
              unmountAtom(a)
            }
          }
        }
      })
    } else if (
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] could not find atom state to unmount', atom)
    }
  }

  const mountDependencies = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>,
    prevReadDependencies: ReadDependencies
  ): void => {
    const dependencies = new Set(atomState.d.keys())
    prevReadDependencies.forEach((_, a) => {
      if (dependencies.has(a)) {
        // not changed
        dependencies.delete(a)
        return
      }
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.d.delete(atom) // delete from dependents
        if (canUnmountAtom(a, mounted)) {
          unmountAtom(a)
        }
      }
    })
    dependencies.forEach((a) => {
      const mounted = mountedMap.get(a)
      if (mounted) {
        mounted.d.add(atom) // add to dependents
      } else {
        mountAtom(a, atom)
      }
    })
  }

  const flushPending = (version: VersionObject | undefined): void => {
    if (version) {
      const versionedAtomStateMap = getVersionedAtomStateMap(version)
      // TODO no need to flush everything
      versionedAtomStateMap.forEach((_, atom) => {
        const mounted = mountedMap.get(atom)
        mounted?.l.forEach((listener) => listener(version))
      })
      return
    }
    const pending = Array.from(pendingMap)
    pendingMap.clear()
    pending.forEach(([atom, prevAtomState]) => {
      const atomState = committedAtomStateMap.get(atom)
      if (atomState && atomState.d !== prevAtomState?.d) {
        mountDependencies(atom, atomState, prevAtomState?.d || new Map())
      }
      const mounted = mountedMap.get(atom)
      mounted?.l.forEach((listener) => listener())
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        stateListeners.forEach((l) => l(atom, !prevAtomState))
      }
    })
  }

  const commitVersionedAtomStateMap = (version: VersionObject) => {
    const versionedAtomStateMap = getVersionedAtomStateMap(version)
    versionedAtomStateMap.forEach((atomState, atom) => {
      const prevAtomState = committedAtomStateMap.get(atom)
      if (atomState.u > (prevAtomState?.u || 0)) {
        committedAtomStateMap.set(atom, atomState)
        if (atomState && atomState.d !== prevAtomState?.d) {
          mountDependencies(atom, atomState, prevAtomState?.d || new Map())
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
    callback: (version?: VersionObject) => void
  ) => {
    const mounted = addAtom(atom)
    const listeners = mounted.l
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
      delAtom(atom)
    }
  }

  const restoreAtoms = (
    values: Iterable<readonly [AnyAtom, unknown]>,
    version?: VersionObject
  ): void => {
    for (const [atom, value] of values) {
      if (hasInitialValue(atom)) {
        setAtomValue(version, atom, value)
        invalidateDependents(version, atom)
      }
    }
    flushPending(version)
  }

  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
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

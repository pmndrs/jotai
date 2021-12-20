import type { Atom, WritableAtom } from './atom'
import {
  cancelSuspensePromise,
  createSuspensePromise,
  isEqualSuspensePromise,
  isSuspensePromise,
  isSuspensePromiseAlreadyCancelled,
} from './suspensePromise'
import type { SuspensePromise } from './suspensePromise'

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

type ReadError = unknown
type Revision = number
type InvalidatedRevision = number
type ReadDependencies = Map<AnyAtom, Revision>

// immutable atom state
export type AtomState<Value = unknown> = {
  r: Revision
  i?: InvalidatedRevision
  d: ReadDependencies
} & ({ e: ReadError } | { p: SuspensePromise } | { v: ResolveType<Value> })

type Listeners = Set<() => void>
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
  const atomStateMap = new WeakMap<AnyAtom, AtomState>()
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
      const atomState: AtomState = { v: value, r: 0, d: new Map() }
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
      atomStateMap.set(atom, atomState)
    }
  }

  const getAtomState = <Value>(atom: Atom<Value>) =>
    atomStateMap.get(atom) as AtomState<Value> | undefined

  const setAtomState = <Value>(
    atom: Atom<Value>,
    atomState: AtomState<Value>
  ): void => {
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      Object.freeze(atomState)
    }
    const prevAtomState = atomStateMap.get(atom)
    atomStateMap.set(atom, atomState)
    if (!pendingMap.has(atom)) {
      pendingMap.set(atom, prevAtomState)
    }
  }

  const getReadDependencies = (dependencies: Set<AnyAtom>): ReadDependencies =>
    new Map(Array.from(dependencies).map((a) => [a, getAtomState(a)?.r || 0]))

  const setAtomValue = <Value>(
    atom: Atom<Value>,
    value: ResolveType<Value>,
    dependencies?: Set<AnyAtom>,
    suspensePromise?: SuspensePromise
  ): AtomState<Value> => {
    const atomState = getAtomState(atom)
    if (atomState) {
      if (
        suspensePromise &&
        (!('p' in atomState) ||
          !isEqualSuspensePromise(atomState.p, suspensePromise))
      ) {
        // newer async read is running, not updating
        return atomState
      }
      if ('p' in atomState) {
        cancelSuspensePromise(atomState.p)
      }
    }
    const nextAtomState: AtomState<Value> = {
      v: value,
      r: atomState?.r || 0,
      d: dependencies
        ? getReadDependencies(dependencies)
        : atomState?.d || new Map(),
    }
    if (
      !atomState ||
      !('v' in atomState) || // new value, or
      !Object.is(atomState.v, value) // different value
    ) {
      ++nextAtomState.r // increment revision
      if (nextAtomState.d.has(atom)) {
        nextAtomState.d.set(atom, nextAtomState.r)
      }
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const setAtomReadError = <Value>(
    atom: Atom<Value>,
    error: ReadError,
    dependencies?: Set<AnyAtom>,
    suspensePromise?: SuspensePromise
  ): AtomState<Value> => {
    const atomState = getAtomState(atom)
    if (atomState) {
      if (
        suspensePromise &&
        (!('p' in atomState) ||
          !isEqualSuspensePromise(atomState.p, suspensePromise))
      ) {
        // newer async read is running, not updating
        return atomState
      }
      if ('p' in atomState) {
        cancelSuspensePromise(atomState.p)
      }
    }
    const nextAtomState: AtomState<Value> = {
      e: error, // set read error
      r: atomState?.r || 0,
      d: dependencies
        ? getReadDependencies(dependencies)
        : atomState?.d || new Map(),
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const setAtomSuspensePromise = <Value>(
    atom: Atom<Value>,
    suspensePromise: SuspensePromise,
    dependencies?: Set<AnyAtom>
  ): AtomState<Value> => {
    const atomState = getAtomState(atom)
    if (atomState && 'p' in atomState) {
      if (isEqualSuspensePromise(atomState.p, suspensePromise)) {
        // the same promise, not updating
        return atomState
      }
      cancelSuspensePromise(atomState.p)
    }
    const nextAtomState: AtomState<Value> = {
      p: suspensePromise,
      r: atomState?.r || 0,
      d: dependencies
        ? getReadDependencies(dependencies)
        : atomState?.d || new Map(),
    }
    setAtomState(atom, nextAtomState)
    return nextAtomState
  }

  const setAtomPromiseOrValue = <Value>(
    atom: Atom<Value>,
    promiseOrValue: Value,
    dependencies?: Set<AnyAtom>
  ): AtomState<Value> => {
    if (promiseOrValue instanceof Promise) {
      const suspensePromise = createSuspensePromise(
        promiseOrValue
          .then((value: ResolveType<Value>) => {
            setAtomValue(atom, value, dependencies, suspensePromise)
            flushPending()
          })
          .catch((e) => {
            if (e instanceof Promise) {
              if (
                isSuspensePromise(e) &&
                isSuspensePromiseAlreadyCancelled(e)
              ) {
                // schedule another read later
                // FIXME not 100% confident with this code
                e.then(() => readAtomState(atom, true))
              }
              return e
            }
            setAtomReadError(atom, e, dependencies, suspensePromise)
            flushPending()
          })
      )
      return setAtomSuspensePromise(atom, suspensePromise, dependencies)
    }
    return setAtomValue(
      atom,
      promiseOrValue as ResolveType<Value>,
      dependencies
    )
  }

  const setAtomInvalidated = <Value>(atom: Atom<Value>): void => {
    const atomState = getAtomState(atom)
    if (atomState) {
      const nextAtomState: AtomState<Value> = {
        ...atomState, // copy everything
        i: atomState.r, // set invalidated revision
      }
      setAtomState(atom, nextAtomState)
    } else if (
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] could not invalidate non existing atom', atom)
    }
  }

  const readAtomState = <Value>(
    atom: Atom<Value>,
    force?: boolean
  ): AtomState<Value> => {
    if (!force) {
      const atomState = getAtomState(atom)
      if (atomState) {
        atomState.d.forEach((_, a) => {
          if (a !== atom) {
            if (!mountedMap.has(a)) {
              // not mounted
              readAtomState(a)
            } else {
              const aState = getAtomState(a)
              if (
                aState &&
                aState.r === aState.i // revision is invalidated
              ) {
                readAtomState(a)
              }
            }
          }
        })
        if (
          Array.from(atomState.d.entries()).every(([a, r]) => {
            const aState = getAtomState(a)
            return (
              aState &&
              !('e' in aState) && // no read error
              !('p' in aState) && // no suspense promise
              aState.r === r // revision is equal to the last one
            )
          })
        ) {
          return atomState
        }
      }
    }
    const dependencies = new Set<AnyAtom>()
    try {
      const promiseOrValue = atom.read(<V>(a: Atom<V>) => {
        dependencies.add(a)
        const aState =
          (a as AnyAtom) === atom ? getAtomState(a) : readAtomState(a)
        if (aState) {
          if ('e' in aState) {
            throw aState.e // read error
          }
          if ('p' in aState) {
            throw aState.p // suspense promise
          }
          return aState.v as ResolveType<V> // value
        }
        if (hasInitialValue(a)) {
          return a.init
        }
        // NOTE invalid derived atoms can reach here
        throw new Error('no atom init')
      })
      return setAtomPromiseOrValue(atom, promiseOrValue, dependencies)
    } catch (errorOrPromise) {
      if (errorOrPromise instanceof Promise) {
        const suspensePromise = createSuspensePromise(errorOrPromise)
        return setAtomSuspensePromise(atom, suspensePromise, dependencies)
      }
      return setAtomReadError(atom, errorOrPromise, dependencies)
    }
  }

  const readAtom = <Value>(readingAtom: Atom<Value>): AtomState<Value> => {
    const atomState = readAtomState(readingAtom)
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

  const invalidateDependents = <Value>(atom: Atom<Value>): void => {
    const mounted = mountedMap.get(atom)
    mounted?.d.forEach((dependent) => {
      if (dependent !== atom) {
        setAtomInvalidated(dependent)
        invalidateDependents(dependent)
      }
    })
  }

  const writeAtomState = <Value, Update, Result extends void | Promise<void>>(
    atom: WritableAtom<Value, Update, Result>,
    update: Update
  ): void | Promise<void> => {
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
      const aState = readAtomState(a)
      if ('e' in aState) {
        throw aState.e // read error
      }
      if ('p' in aState) {
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
        throw aState.p // suspense promise
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
        setAtomPromiseOrValue(a, v)
        invalidateDependents(a)
        flushPending()
      } else {
        promiseOrVoid = writeAtomState(a as AnyWritableAtom, v)
      }
      return promiseOrVoid
    }
    const promiseOrVoid = atom.write(writeGetter, setter, update)
    flushPending()
    return promiseOrVoid
  }

  const writeAtom = <Value, Update, Result extends void | Promise<void>>(
    writingAtom: WritableAtom<Value, Update, Result>,
    update: Update
  ): void | Promise<void> => {
    const promiseOrVoid = writeAtomState(writingAtom, update)
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
    const atomState = readAtomState(atom)
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
    const atomState = getAtomState(atom)
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

  const flushPending = (): void => {
    const pending = Array.from(pendingMap)
    pendingMap.clear()
    pending.forEach(([atom, prevAtomState]) => {
      const atomState = getAtomState(atom)
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

  const commitAtom = (_atom: AnyAtom) => {
    flushPending()
  }

  const subscribeAtom = (atom: AnyAtom, callback: () => void) => {
    const mounted = addAtom(atom)
    const listeners = mounted.l
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
      delAtom(atom)
    }
  }

  const restoreAtoms = (
    values: Iterable<readonly [AnyAtom, unknown]>
  ): void => {
    for (const [atom, value] of values) {
      if (hasInitialValue(atom)) {
        setAtomPromiseOrValue(atom, value)
        invalidateDependents(atom)
      }
    }
    flushPending()
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
      [DEV_GET_ATOM_STATE]: (a: AnyAtom) => atomStateMap.get(a),
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

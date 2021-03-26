import type {
  Atom,
  WritableAtom,
  WithInitialValue,
  AnyAtom,
  AnyWritableAtom,
  Getter,
  Setter,
  OnUnmount,
} from './types'

const hasInitialValue = <T extends Atom<unknown>>(
  atom: T
): atom is T &
  (T extends Atom<infer Value> ? WithInitialValue<Value> : never) =>
  'init' in atom

type Revision = number
type InvalidatedRevision = number
type ReadDependencies = Map<AnyAtom, Revision>

// immutable atom state
export type AtomState<Value = unknown> = {
  e?: Error // read error
  p?: Promise<void> // read promise
  w?: Promise<void> // write promise
  v?: Value
  r: Revision
  i?: InvalidatedRevision
  d: ReadDependencies
}

type AtomStateMap = WeakMap<AnyAtom, AtomState>

type Listeners = Set<() => void>
type Dependents = Set<AnyAtom>
type Mounted = {
  l: Listeners
  d: Dependents
  u: OnUnmount | void
}

type MountedMap = WeakMap<AnyAtom, Mounted>

export type NewAtomReceiver = (newAtom: AnyAtom) => void

type StateVersion = number

type PendingAtoms = Set<AnyAtom>

// mutable state
export type State = {
  n?: NewAtomReceiver
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  p: PendingAtoms
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>,
  newAtomReceiver?: NewAtomReceiver
): State => {
  const state: State = {
    n: newAtomReceiver,
    v: 0,
    a: new WeakMap(),
    m: new WeakMap(),
    p: new Set(),
  }
  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState: AtomState = { v: value, r: 0, d: new Map() }
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
    }
  }
  return state
}

const getAtomState = <Value>(state: State, atom: Atom<Value>) =>
  state.a.get(atom) as AtomState<Value> | undefined

const wipAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  dependencies?: Set<AnyAtom>
): [AtomState<Value>, ReadDependencies | undefined] => {
  const atomState = getAtomState(state, atom)
  const nextAtomState = {
    r: 0,
    ...atomState,
    d: dependencies
      ? new Map(
          Array.from(dependencies).map((a) => [
            a,
            getAtomState(state, a)?.r ?? 0,
          ])
        )
      : atomState
      ? atomState.d
      : new Map(),
  }
  if (!atomState && hasInitialValue(atom)) {
    nextAtomState.v = atom.init
  }
  return [nextAtomState, atomState?.d]
}

const setAtomValue = <Value>(
  state: State,
  atom: Atom<Value>,
  value: Value,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  if (promise && promise !== atomState?.p) {
    // newer async read is running, not updating
    return
  }
  delete atomState.e // read error
  delete atomState.p // read promise
  delete atomState.i // invalidated revision
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r // increment revision
  }
  commitAtomState(state, atom, atomState)
  mountDependencies(state, atom, atomState, prevDependencies)
}

const setAtomReadError = <Value>(
  state: State,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom>,
  promise?: Promise<void>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  if (promise && promise !== atomState?.p) {
    // newer async read is running, not updating
    return
  }
  delete atomState.p // read promise
  delete atomState.i // invalidated revision
  atomState.e = error // read error
  commitAtomState(state, atom, atomState)
  mountDependencies(state, atom, atomState, prevDependencies)
}

const setAtomReadPromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  atomState.p = promise // read promise
  commitAtomState(state, atom, atomState)
  mountDependencies(state, atom, atomState, prevDependencies)
}

const setAtomInvalidated = <Value>(state: State, atom: Atom<Value>): void => {
  const [atomState] = wipAtomState(state, atom)
  atomState.i = atomState.r // invalidated revision
  commitAtomState(state, atom, atomState)
}

const setAtomWritePromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise?: Promise<void>
): void => {
  const [atomState] = wipAtomState(state, atom)
  if (promise) {
    atomState.w = promise
  } else {
    delete atomState.w // write promise
  }
  commitAtomState(state, atom, atomState)
}

const scheduleReadAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<unknown>
): void => {
  promise.then(() => {
    readAtomState(state, atom, true)
  })
}

const readAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  force?: boolean
): AtomState<Value> => {
  if (!force) {
    const atomState = getAtomState(state, atom)
    if (atomState) {
      atomState.d.forEach((_, a) => {
        if (a !== atom) {
          const aState = getAtomState(state, a)
          if (
            aState &&
            !aState.e && // no read error
            !aState.p && // no read promise
            aState.r === aState.i // revision is invalidated
          ) {
            readAtomState(state, a, true)
          }
        }
      })
      if (
        Array.from(atomState.d.entries()).every(([a, r]) => {
          const aState = getAtomState(state, a)
          return (
            aState &&
            !aState.e && // no read error
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
  let error: Error | undefined
  let promise: Promise<void> | undefined
  let value: Value | undefined
  const dependencies = new Set<AnyAtom>()
  try {
    const promiseOrValue = atom.read(((a: AnyAtom) => {
      dependencies.add(a)
      if (a !== atom) {
        const aState = readAtomState(state, a)
        if (aState.e) {
          throw aState.e // read error
        }
        if (aState.p) {
          throw aState.p // read promise
        }
        return aState.v // value
      }
      // a === atom
      const aState = getAtomState(state, a)
      if (aState) {
        if (aState.p) {
          throw aState.p // read promise
        }
        return aState.v // value
      }
      if (hasInitialValue(a)) {
        return a.init
      }
      throw new Error('no atom init')
    }) as Getter)
    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then((value) => {
          setAtomValue(
            state,
            atom,
            value,
            dependencies,
            promise as Promise<void>
          )
          flushPending(state)
        })
        .catch((e) => {
          if (e instanceof Promise) {
            scheduleReadAtomState(state, atom, e)
            return e
          }
          setAtomReadError(
            state,
            atom,
            e instanceof Error ? e : new Error(e),
            dependencies,
            promise as Promise<void>
          )
          flushPending(state)
        })
    } else {
      value = promiseOrValue
    }
  } catch (errorOrPromise) {
    if (errorOrPromise instanceof Promise) {
      scheduleReadAtomState(state, atom, errorOrPromise)
      promise = errorOrPromise
    } else if (errorOrPromise instanceof Error) {
      error = errorOrPromise
    } else {
      error = new Error(errorOrPromise)
    }
  }
  if (error) {
    setAtomReadError(state, atom, error, dependencies)
  } else if (promise) {
    setAtomReadPromise(state, atom, promise, dependencies)
  } else {
    setAtomValue(state, atom, value, dependencies)
  }
  return getAtomState(state, atom) as AtomState<Value>
}

export const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const atomState = readAtomState(state, readingAtom)
  state.p.delete(readingAtom)
  flushPending(state)
  return atomState
}

const addAtom = (state: State, addingAtom: AnyAtom): Mounted => {
  let mounted = state.m.get(addingAtom)
  if (!mounted) {
    mounted = mountAtom(state, addingAtom)
  }
  flushPending(state)
  return mounted
}

// XXX doesn't work with mutally dependent atoms
const canUnmountAtom = (atom: AnyAtom, mounted: Mounted) =>
  !mounted.l.size &&
  (!mounted.d.size || (mounted.d.size === 1 && mounted.d.has(atom)))

const delAtom = (state: State, deletingAtom: AnyAtom): void => {
  const mounted = state.m.get(deletingAtom)
  if (mounted && canUnmountAtom(deletingAtom, mounted)) {
    unmountAtom(state, deletingAtom)
  }
  flushPending(state)
}

const invalidateDependents = <Value>(state: State, atom: Atom<Value>): void => {
  const mounted = state.m.get(atom)
  mounted?.d.forEach((dependent) => {
    if (dependent === atom) {
      return
    }
    setAtomInvalidated(state, dependent)
    invalidateDependents(state, dependent)
  })
}

const writeAtomState = <Value, Update>(
  state: State,
  atom: WritableAtom<Value, Update>,
  update: Update,
  pendingPromises: Promise<void>[]
): void => {
  const isPendingPromisesExpired = !pendingPromises.length
  const atomState = getAtomState(state, atom)
  if (
    atomState &&
    atomState.w // write promise
  ) {
    const promise = atomState.w.then(() => {
      writeAtomState(state, atom, update, pendingPromises)
      if (isPendingPromisesExpired) {
        flushPending(state)
      }
    })
    if (!isPendingPromisesExpired) {
      pendingPromises.push(promise)
    }
    return
  }
  try {
    const promiseOrVoid = atom.write(
      ((a: AnyAtom) => {
        const aState = readAtomState(state, a)
        if (aState.e) {
          throw aState.e // read error
        }
        if (aState.p) {
          if (
            typeof process === 'object' &&
            process.env.NODE_ENV !== 'production'
          ) {
            console.warn(
              'Reading pending atom state in write operation. We throw a promise for now.',
              a
            )
          }
          throw aState.p // read promise
        }
        if ('v' in aState) {
          return aState.v // value
        }
        if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn(
            '[Bug] no value found while reading atom in write operation. This probably a bug.',
            a
          )
        }
        throw new Error('no value found')
      }) as Getter,
      ((a: AnyWritableAtom, v: unknown) => {
        if (a === atom) {
          setAtomValue(state, a, v)
          invalidateDependents(state, a)
        } else {
          const isPendingPromisesExpired = !pendingPromises.length
          writeAtomState(state, a, v, pendingPromises)
          if (isPendingPromisesExpired) {
            flushPending(state)
          }
        }
      }) as Setter,
      update
    )
    if (promiseOrVoid instanceof Promise) {
      const promise = promiseOrVoid.then(() => {
        setAtomWritePromise(state, atom)
        if (isPendingPromisesExpired) {
          flushPending(state)
        }
      })
      if (!isPendingPromisesExpired) {
        pendingPromises.push(promise)
      }
      setAtomWritePromise(state, atom, promise)
    }
  } catch (e) {
    if (pendingPromises.length === 1) {
      // still in sync, throw it right away
      throw e
    } else if (!isPendingPromisesExpired) {
      pendingPromises.push(
        new Promise((_resolve, reject) => {
          reject(e)
        })
      )
    } else {
      console.error('Uncaught exception: Use promise to catch error', e)
    }
  }
}

export const writeAtom = <Value, Update>(
  state: State,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void | Promise<void> => {
  const pendingPromises: Promise<void>[] = [Promise.resolve()]

  writeAtomState(state, writingAtom, update, pendingPromises)
  flushPending(state)

  if (pendingPromises.length <= 1) {
    pendingPromises.splice(0)
  } else {
    return new Promise<void>((resolve, reject) => {
      const loop = () => {
        if (pendingPromises.length <= 1) {
          pendingPromises.splice(0)
          resolve()
        } else {
          Promise.all(pendingPromises)
            .then(() => {
              pendingPromises.splice(1)
              flushPending(state)
              loop()
            })
            .catch(reject)
        }
      }
      loop()
    })
  }
}

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

const mountAtom = <Value>(
  state: State,
  atom: Atom<Value>,
  initialDependent?: AnyAtom
): Mounted => {
  // mount dependencies beforehand
  const atomState = getAtomState(state, atom)
  if (atomState) {
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        // check if not mounted
        if (!state.m.has(a)) {
          mountAtom(state, a, atom)
        }
      }
    })
  } else if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[Bug] could not find atom state to mount', atom)
  }
  // mount self
  const mounted: Mounted = {
    d: new Set(initialDependent && [initialDependent]),
    l: new Set(),
    u: undefined,
  }
  state.m.set(atom, mounted)
  if (isActuallyWritableAtom(atom) && atom.onMount) {
    const setAtom = (update: unknown) => writeAtom(state, atom, update)
    mounted.u = atom.onMount(setAtom)
  }
  return mounted
}

const unmountAtom = <Value>(state: State, atom: Atom<Value>): void => {
  // unmount self
  const onUnmount = state.m.get(atom)?.u
  if (onUnmount) {
    onUnmount()
  }
  state.m.delete(atom)
  // unmount dependencies afterward
  const atomState = getAtomState(state, atom)
  if (atomState) {
    if (
      atomState.p && // read promise
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] deleting atomState with read promise', atom)
    }
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const mounted = state.m.get(a)
        if (mounted) {
          mounted.d.delete(atom)
          if (canUnmountAtom(a, mounted)) {
            unmountAtom(state, a)
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
  state: State,
  atom: Atom<Value>,
  atomState: AtomState<Value>,
  prevDependencies?: ReadDependencies
): void => {
  if (prevDependencies !== atomState.d) {
    const dependencies = new Set(atomState.d.keys())
    if (prevDependencies) {
      prevDependencies.forEach((_, a) => {
        const mounted = state.m.get(a)
        if (dependencies.has(a)) {
          // not changed
          dependencies.delete(a)
        } else if (mounted) {
          mounted.d.delete(atom)
          if (canUnmountAtom(a, mounted)) {
            unmountAtom(state, a)
          }
        } else if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn('[Bug] a dependency is not mounted', a)
        }
      })
    }
    dependencies.forEach((a) => {
      const mounted = state.m.get(a)
      if (mounted) {
        const dependents = mounted.d
        dependents.add(atom)
      } else {
        mountAtom(state, a, atom)
      }
    })
  }
}

const commitAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  atomState: AtomState<Value>
): void => {
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    Object.freeze(atomState)
  }
  const isNewAtom = state.n && !state.a.has(atom)
  state.a.set(atom, atomState)
  if (isNewAtom) {
    ;(state.n as NewAtomReceiver)(atom)
  }
  ++state.v
  state.p.add(atom)
}

const flushPending = (state: State): void => {
  state.p.forEach((atom) => {
    const mounted = state.m.get(atom)
    mounted?.l.forEach((listener) => listener())
  })
  state.p.clear()
}

export const subscribeAtom = (
  state: State,
  atom: AnyAtom,
  callback: () => void
) => {
  const mounted = addAtom(state, atom)
  const listeners = mounted.l
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
    delAtom(state, atom)
  }
}

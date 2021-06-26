import type { Atom, WritableAtom } from './atom'

type AnyAtom = Atom<unknown>
type AnyWritableAtom = WritableAtom<unknown, unknown>
type OnUnmount = () => void
type NonPromise<T> = T extends Promise<infer V> ? V : T
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
  [INTERRUPT_PROMISE]: () => void
}

const isInterruptablePromise = (
  promise: Promise<void>
): promise is InterruptablePromise =>
  !!(promise as InterruptablePromise)[INTERRUPT_PROMISE]

const createInterruptablePromise = (
  promise: Promise<void>
): InterruptablePromise => {
  let interrupt: (() => void) | undefined
  const interruptablePromise = new Promise<void>((resolve, reject) => {
    interrupt = resolve
    promise.then(resolve, reject)
  }) as InterruptablePromise
  interruptablePromise[IS_EQUAL_PROMISE] = (p: Promise<void>) =>
    p === interruptablePromise || p === promise
  interruptablePromise[INTERRUPT_PROMISE] = interrupt as () => void
  return interruptablePromise
}

type Revision = number
type InvalidatedRevision = number
type ReadDependencies = Map<AnyAtom, Revision>

// immutable atom state
export type AtomState<Value = unknown> = {
  e?: Error // read error
  p?: InterruptablePromise // read promise
  c?: () => void // cancel read promise
  w?: Promise<void> // write promise
  v?: NonPromise<Value>
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

// for debugging purpose only
type StateListener = (updatedAtom: AnyAtom, isNewAtom: boolean) => void

type StateVersion = number

type PendingMap = Map<AnyAtom, ReadDependencies | undefined>

// mutable state
export type State = {
  l?: StateListener
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  p: PendingMap
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>,
  stateListener?: StateListener
): State => {
  const state: State = {
    l: stateListener,
    v: 0,
    a: new WeakMap(),
    m: new WeakMap(),
    p: new Map(),
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
): [AtomState<Value>, ReadDependencies] => {
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
      : atomState?.d || new Map(),
  }
  return [nextAtomState, atomState?.d || new Map()]
}

const setAtomValue = <Value>(
  state: State,
  atom: Atom<Value>,
  value: NonPromise<Value>,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  if (promise && !atomState.p?.[IS_EQUAL_PROMISE](promise)) {
    // newer async read is running, not updating
    return
  }
  atomState.c?.() // cancel read promise
  delete atomState.e // read error
  delete atomState.p // read promise
  delete atomState.c // cancel read promise
  delete atomState.i // invalidated revision
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r // increment revision
  }
  commitAtomState(state, atom, atomState, dependencies && prevDependencies)
}

const setAtomReadError = <Value>(
  state: State,
  atom: Atom<Value>,
  error: Error,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  if (promise && !atomState.p?.[IS_EQUAL_PROMISE](promise)) {
    // newer async read is running, not updating
    return
  }
  atomState.c?.() // cancel read promise
  delete atomState.p // read promise
  delete atomState.c // cancel read promise
  delete atomState.i // invalidated revision
  atomState.e = error // read error
  commitAtomState(state, atom, atomState, prevDependencies)
}

const setAtomReadPromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies?: Set<AnyAtom>
): void => {
  const [atomState, prevDependencies] = wipAtomState(state, atom, dependencies)
  if (atomState.p?.[IS_EQUAL_PROMISE](promise)) {
    // the same promise, not updating
    return
  }
  atomState.c?.() // cancel read promise
  if (isInterruptablePromise(promise)) {
    atomState.p = promise // read promise
    delete atomState.c // this promise is from another atom state, shouldn't be canceled here
  } else {
    const interruptablePromise = createInterruptablePromise(promise)
    atomState.p = interruptablePromise // read promise
    atomState.c = interruptablePromise[INTERRUPT_PROMISE]
  }
  commitAtomState(state, atom, atomState, prevDependencies)
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
  promise.finally(() => {
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
  let value: NonPromise<Value> | undefined
  const dependencies = new Set<AnyAtom>()
  try {
    const promiseOrValue = atom.read((a: AnyAtom) => {
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
    })
    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then((value) => {
          setAtomValue(
            state,
            atom,
            value as NonPromise<Value>,
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
      value = promiseOrValue as NonPromise<Value>
    }
  } catch (errorOrPromise) {
    if (errorOrPromise instanceof Promise) {
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
    setAtomValue(state, atom, value as NonPromise<Value>, dependencies)
  }
  return getAtomState(state, atom) as AtomState<Value>
}

export const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const atomState = readAtomState(state, readingAtom)
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

// FIXME doesn't work with mutally dependent atoms
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
  update: Update
): void => {
  const writePromise = getAtomState(state, atom)?.w
  if (writePromise) {
    writePromise.then(() => {
      writeAtomState(state, atom, update)
      flushPending(state)
    })
    return
  }
  const writeGetter: WriteGetter = (a: AnyAtom, unstable_promise?: boolean) => {
    const aState = readAtomState(state, a)
    if (aState.e) {
      throw aState.e // read error
    }
    if (aState.p) {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        if (unstable_promise) {
          console.info(
            'promise option in getter is an experimental feature.',
            a
          )
        } else {
          console.warn(
            'Reading pending atom state in write operation. We throw a promise for now.',
            a
          )
        }
      }
      if (unstable_promise) {
        return aState.p.then(() => writeGetter(a, unstable_promise))
      }
      throw aState.p // read promise
    }
    if ('v' in aState) {
      return aState.v // value
    }
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[Bug] no value found while reading atom in write operation. This is probably a bug.',
        a
      )
    }
    throw new Error('no value found')
  }
  const promiseOrVoid = atom.write(
    writeGetter,
    ((a: AnyWritableAtom, v: unknown) => {
      if (a === atom) {
        if (!hasInitialValue(a)) {
          // NOTE technically possible but restricted as it may cause bugs
          throw new Error('no atom init')
        }
        if (v instanceof Promise) {
          const promise = v
            .then((resolvedValue) => {
              setAtomValue(state, a, resolvedValue)
              invalidateDependents(state, a)
              flushPending(state)
            })
            .catch((e) => {
              setAtomReadError(
                state,
                atom,
                e instanceof Error ? e : new Error(e)
              )
              flushPending(state)
            })
          setAtomReadPromise(state, atom, promise)
        } else {
          setAtomValue(state, a, v)
        }
        invalidateDependents(state, a)
      } else {
        writeAtomState(state, a, v)
      }
      flushPending(state)
    }) as Setter,
    update
  )
  if (promiseOrVoid instanceof Promise) {
    const promise = promiseOrVoid.finally(() => {
      setAtomWritePromise(state, atom)
      flushPending(state)
    })
    setAtomWritePromise(state, atom, promise)
  }
  // TODO write error is not handled
}

export const writeAtom = <Value, Update>(
  state: State,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void => {
  writeAtomState(state, writingAtom, update)
  flushPending(state)
}

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

const mountAtom = <Value>(
  state: State,
  atom: Atom<Value>,
  initialDependent?: AnyAtom
): Mounted => {
  const atomState = readAtomState(state, atom)
  // mount read dependencies beforehand
  atomState.d.forEach((_, a) => {
    if (a !== atom) {
      const aMounted = state.m.get(a)
      if (aMounted) {
        aMounted.d.add(atom) // add dependent
      } else {
        mountAtom(state, a, atom)
      }
    }
  })
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
  // unmount read dependencies afterward
  const atomState = getAtomState(state, atom)
  if (atomState) {
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
  prevDependencies: ReadDependencies
): void => {
  const dependencies = new Set(atomState.d.keys())
  prevDependencies.forEach((_, a) => {
    if (dependencies.has(a)) {
      // not changed
      dependencies.delete(a)
      return
    }
    const mounted = state.m.get(a)
    if (mounted) {
      mounted.d.delete(atom)
      if (canUnmountAtom(a, mounted)) {
        unmountAtom(state, a)
      }
    }
  })
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

const commitAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  atomState: AtomState<Value>,
  prevDependencies?: ReadDependencies
): void => {
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    Object.freeze(atomState)
  }
  const isNewAtom = !state.a.has(atom)
  state.a.set(atom, atomState)
  if (state.l) {
    state.l(atom, isNewAtom)
  }
  ++state.v
  if (!state.p.has(atom)) {
    state.p.set(atom, prevDependencies)
  }
}

export const flushPending = (state: State): void => {
  const pending = Array.from(state.p)
  state.p.clear()
  pending.forEach(([atom, prevDependencies]) => {
    const atomState = getAtomState(state, atom)
    if (atomState) {
      if (prevDependencies) {
        mountDependencies(state, atom, atomState, prevDependencies)
      }
    } else if (
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] atom state not found in flush', atom)
    }
    const mounted = state.m.get(atom)
    mounted?.l.forEach((listener) => listener())
  })
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

export const restoreAtoms = (
  state: State,
  values: Iterable<readonly [AnyAtom, unknown]>
): void => {
  for (const [atom, value] of values) {
    if (hasInitialValue(atom)) {
      setAtomValue(state, atom, value)
      invalidateDependents(state, atom)
    }
  }
  flushPending(state)
}

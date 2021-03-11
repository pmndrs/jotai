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

const concatMap = <K, V>(m1: Map<K, V>, m2: Map<K, V>): Map<K, V> => {
  // Map([...m1, ...m2]) alternative
  const newMap = new Map(m1)
  m2.forEach((value, key) => {
    newMap.set(key, value)
  })
  return newMap
}

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

// immutable map
// This is a partial map of AtomStateMap
// It will be used to run updates in a batch with UpdateState
// TODO it would be nice to avoid this completely if possible
type WorkInProgress = Map<AnyAtom, AtomState>

type UpdateState = (updater: (prev: WorkInProgress) => WorkInProgress) => void

// mutable state
export type State = {
  n?: NewAtomReceiver
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  u: UpdateState
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>,
  newAtomReceiver?: NewAtomReceiver
): State => {
  type Updater = Parameters<UpdateState>[0]
  let currWip: WorkInProgress = new Map()
  const queue: Updater[] = []
  const updateState = (updater: Updater) => {
    queue.push(updater)
    if (queue.length > 1) {
      return
    }
    let nextWip = currWip
    while (queue.length) {
      nextWip = queue[0](nextWip)
      queue.shift()
    }
    if (nextWip !== currWip) {
      currWip = nextWip
      if (currWip.size) {
        const atomsToNotify = new Set(currWip.keys())
        mountDependencies(state, currWip)
        commitState(state, currWip)
        ++state.v
        atomsToNotify.forEach((atom) => {
          const mounted = state.m.get(atom)
          mounted?.l.forEach((listener) => listener())
        })
      }
    }
  }
  const state: State = {
    n: newAtomReceiver,
    v: 0,
    a: new WeakMap(),
    m: new WeakMap(),
    u: updateState,
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

const getAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
) => (wip.get(atom) || state.a.get(atom)) as AtomState<Value> | undefined

const wipAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): AtomState<Value> | null => {
  const atomState = getAtomState(state, wip, atom)
  if (promise && promise !== atomState?.p) {
    // newer async read is running, not updating
    return null
  }
  const nextAtomState = {
    r: 0,
    ...atomState,
    d: dependencies
      ? new Map(
          Array.from(dependencies).map((a) => [
            a,
            getAtomState(state, wip, a)?.r ?? 0,
          ])
        )
      : atomState
      ? atomState.d
      : new Map(),
  }
  if (!atomState && hasInitialValue(atom)) {
    nextAtomState.v = atom.init
  }
  return nextAtomState
}

const setAtomValue = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  value: Value,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): WorkInProgress => {
  const atomState = wipAtomState(state, wip, atom, dependencies, promise)
  if (!atomState) {
    return wip
  }
  delete atomState.e
  delete atomState.p
  delete atomState.i
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r
  }
  return new Map(wip).set(atom, atomState)
}

const setAtomReadError = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom>,
  promise?: Promise<void>
): WorkInProgress => {
  const atomState = wipAtomState(state, wip, atom, dependencies, promise)
  if (!atomState) {
    return wip
  }
  delete atomState.p
  delete atomState.i
  atomState.e = error
  return new Map(wip).set(atom, atomState)
}

const setAtomReadPromise = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom>
): WorkInProgress => {
  const atomState = wipAtomState(
    state,
    wip,
    atom,
    dependencies
  ) as AtomState<Value>
  delete atomState.i
  atomState.p = promise
  return new Map(wip).set(atom, atomState)
}

const setAtomInvalidatetd = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
): WorkInProgress => {
  const atomState = wipAtomState(state, wip, atom) as AtomState<Value>
  atomState.i = atomState.r
  return new Map(wip).set(atom, atomState)
}

const setAtomWritePromise = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  promise?: Promise<void>
): WorkInProgress => {
  const atomState = wipAtomState(state, wip, atom) as AtomState<Value>
  if (promise) {
    atomState.w = promise
  } else {
    delete atomState.w
  }
  return new Map(wip).set(atom, atomState)
}

const scheduleReadAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<unknown>
): void => {
  promise.then(() => {
    state.u((wip) => readAtomState(state, wip, atom)[1])
  })
}

const readAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
): readonly [AtomState<Value>, WorkInProgress] => {
  const atomState = getAtomState(state, wip, atom)
  if (atomState) {
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const aState = getAtomState(state, wip, a)
        if (aState && !aState.e && !aState.p && aState.r === aState.i) {
          wip = readAtomState(state, wip, a)[1]
        }
      }
    })
    if (
      Array.from(atomState.d.entries()).every(([a, r]) => {
        const aState = getAtomState(state, wip, a)
        return (
          aState &&
          !aState.e &&
          !aState.p &&
          aState.r !== aState.i &&
          aState.r === r
        )
      })
    ) {
      return [atomState, wip] as const
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
        let aState: AtomState
        ;[aState, wip] = readAtomState(state, wip, a)
        if (aState.e) {
          throw aState.e // read error
        }
        if (aState.p) {
          throw aState.p // read promise
        }
        return aState.v // value
      }
      // a === atom
      const aState = getAtomState(state, wip, a)
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
          state.u((prev) =>
            setAtomValue(
              state,
              concatMap(prev, wip),
              atom,
              value,
              dependencies,
              promise as Promise<void>
            )
          )
        })
        .catch((e) => {
          if (e instanceof Promise) {
            scheduleReadAtomState(state, atom, e)
            return e
          }
          state.u((prev) =>
            setAtomReadError(
              state,
              concatMap(prev, wip),
              atom,
              e instanceof Error ? e : new Error(e),
              dependencies,
              promise as Promise<void>
            )
          )
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
    wip = setAtomReadError(state, wip, atom, error, dependencies)
  } else if (promise) {
    wip = setAtomReadPromise(state, wip, atom, promise, dependencies)
  } else {
    wip = setAtomValue(state, wip, atom, value, dependencies)
  }
  const ret = [getAtomState(state, wip, atom) as AtomState<Value>, wip] as const
  wip = new Map() // for async
  return ret
}

export const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const [atomState, wip] = readAtomState(state, new Map(), readingAtom)
  // schedule commit
  if (wip.size) {
    state.u((prev) => {
      // XXX this is very tricky, any idea to improve?
      mountDependencies(state, wip)
      commitState(state, wip)
      return prev
    })
  }
  return atomState
}

const addAtom = (state: State, addingAtom: AnyAtom): Mounted => {
  let mounted = state.m.get(addingAtom)
  if (!mounted) {
    mounted = mountAtom(state, new Map(), addingAtom)
  }
  return mounted
}

// XXX doesn't work with mutally dependent atoms
const canUnmountAtom = (atom: AnyAtom, mounted: Mounted) =>
  !mounted.l.size &&
  (!mounted.d.size || (mounted.d.size === 1 && mounted.d.has(atom)))

const delAtom = (state: State, deletingAtom: AnyAtom): void => {
  const mounted = state.m.get(deletingAtom)
  if (mounted && canUnmountAtom(deletingAtom, mounted)) {
    unmountAtom(state, new Map(), deletingAtom)
  }
}

const invalidateDependents = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
): WorkInProgress => {
  const mounted = state.m.get(atom)
  mounted?.d.forEach((dependent) => {
    if (dependent === atom) {
      return
    }
    wip = setAtomInvalidatetd(state, wip, dependent)
    wip = invalidateDependents(state, wip, dependent)
  })
  return wip
}

const writeAtomState = <Value, Update>(
  state: State,
  wip: WorkInProgress,
  atom: WritableAtom<Value, Update>,
  update: Update,
  pendingPromises?: Promise<void>[]
): WorkInProgress => {
  const atomState = getAtomState(state, wip, atom)
  if (atomState && atomState.w) {
    const promise = atomState.w.then(() => {
      state.u((prev) => writeAtomState(state, prev, atom, update))
    })
    if (pendingPromises) {
      pendingPromises.push(promise)
    }
    return wip
  }
  try {
    const promiseOrVoid = atom.write(
      ((a: AnyAtom) => {
        const [aState] = readAtomState(state, wip, a)
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
          return aState.v
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
          state.u((prev) =>
            invalidateDependents(state, setAtomValue(state, prev, a, v), a)
          )
        } else {
          state.u((prev) => writeAtomState(state, prev, a, v))
        }
      }) as Setter,
      update
    )
    if (promiseOrVoid instanceof Promise) {
      if (pendingPromises) {
        pendingPromises.push(promiseOrVoid)
      }
      wip = setAtomWritePromise(
        state,
        wip,
        atom,
        promiseOrVoid.then(() => {
          state.u((prev) => setAtomWritePromise(state, prev, atom))
        })
      )
    }
  } catch (e) {
    if (pendingPromises && pendingPromises.length) {
      pendingPromises.push(
        new Promise((_resolve, reject) => {
          reject(e)
        })
      )
    } else {
      throw e
    }
  }
  return wip
}

export const writeAtom = <Value, Update>(
  state: State,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void | Promise<void> => {
  const pendingPromises: Promise<void>[] = []

  state.u((prev) =>
    writeAtomState(state, prev, writingAtom, update, pendingPromises)
  )

  if (pendingPromises.length) {
    return new Promise<void>((resolve, reject) => {
      const loop = () => {
        const len = pendingPromises.length
        if (len === 0) {
          resolve()
        } else {
          Promise.all(pendingPromises)
            .then(() => {
              pendingPromises.splice(0, len)
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

const mountAtom = (
  state: State,
  wip: WorkInProgress,
  atom: AnyAtom,
  initialDependent?: AnyAtom
): Mounted => {
  // mount dependencies beforehand
  const atomState = getAtomState(state, wip, atom)
  if (atomState) {
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        // check if not mounted
        if (!state.m.has(a)) {
          mountAtom(state, wip, a, atom)
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
  state.u((prev) => {
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const setAtom = (update: unknown) => writeAtom(state, atom, update)
      mounted.u = atom.onMount(setAtom)
    }
    return prev
  })
  return mounted
}

const unmountAtom = (
  state: State,
  wip: WorkInProgress,
  atom: AnyAtom
): void => {
  // unmount self
  const onUnmount = state.m.get(atom)?.u
  if (onUnmount) {
    onUnmount()
  }
  state.m.delete(atom)
  // unmount dependencies afterward
  const atomState = getAtomState(state, wip, atom)
  if (atomState) {
    if (
      atomState.p &&
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
            unmountAtom(state, wip, a)
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

const mountDependencies = (state: State, wip: WorkInProgress) => {
  wip.forEach((atomState, atom) => {
    const prevDependencies = state.a.get(atom)?.d
    if (prevDependencies === atomState.d) {
      return
    }
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
            unmountAtom(state, wip, a)
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
        mountAtom(state, wip, a, atom)
      }
    })
  })
}

const commitState = (state: State, wip: WorkInProgress) => {
  // copy wip to AtomStateMap
  wip.forEach((atomState, atom) => {
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      Object.freeze(atomState)
    }
    const isNewAtom = state.n && !state.a.has(atom)
    state.a.set(atom, atomState)
    if (isNewAtom) {
      ;(state.n as NewAtomReceiver)(atom)
    }
  })
  // empty wip
  wip.clear()
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

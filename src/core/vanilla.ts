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
type ReadDependencies = Map<AnyAtom, Revision>

// immutable state
export type AtomState<Value = unknown> = {
  e?: Error // read error
  p?: Promise<void> // read promise
  w?: Promise<void> // write promise
  v?: Value
  r: Revision
  d: ReadDependencies
}

type AtomStateMap = WeakMap<AnyAtom, AtomState>

type Listeners = Set<() => void>
type UseAtomSymbol = symbol
type Dependents = Set<AnyAtom | UseAtomSymbol>
type Mounted = {
  l: Listeners
  d: Dependents
  u: OnUnmount | void
}

type MountedMap = Map<AnyAtom, Mounted>

type StateVersion = number

type WorkInProgress = Map<AnyAtom, AtomState>

export type UpdateState = (updater: (prev: State) => State) => void

// mutable state
export type State = {
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  w: WorkInProgress
  u: UpdateState
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    v: 0,
    a: new WeakMap(),
    m: new Map(),
    w: new Map(),
    u: () => {},
  }
  type Updater = Parameters<UpdateState>[0]
  const queue: Updater[] = []
  state.u = (updater: Updater) => {
    queue.push(updater)
    if (queue.length > 1) {
      return
    }
    let nextState = state
    while (queue.length) {
      nextState = queue[0](nextState)
      queue.shift()
    }
    if (nextState !== state) {
      state.w = nextState.w
      ++state.v
      state.m.forEach((mounted) => {
        mounted.l.forEach((listener) => listener())
      })
    }
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
  (state.w.get(atom) || state.a.get(atom)) as AtomState<Value> | undefined

const copyWip = (state: State, copyingState: State): State => ({
  ...state,
  w: new Map([...state.w, ...copyingState.w]),
})

const wipAtomState = <Value>(
  state: State,
  atom: Atom<Value>
): readonly [AtomState<Value>, State] => {
  let atomState = getAtomState(state, atom)
  if (atomState) {
    atomState = { ...atomState } // copy
  } else {
    atomState = { r: 0, d: new Map() }
    if (hasInitialValue(atom)) {
      atomState.v = atom.init
    }
  }
  const nextState = {
    ...state,
    w: new Map(state.w).set(atom, atomState), // copy
  }
  return [atomState, nextState] as const
}

const replaceDependencies = (
  state: State,
  atomState: AtomState,
  dependencies?: Set<AnyAtom>
): void => {
  if (dependencies) {
    atomState.d = new Map(
      Array.from(dependencies).map((a) => [a, getAtomState(state, a)?.r ?? 0])
    )
  }
}

const setAtomValue = <Value>(
  state: State,
  atom: Atom<Value>,
  value: Value,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  if (promise && promise !== atomState.p) {
    return state
  }
  delete atomState.e
  delete atomState.p
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r
  }
  replaceDependencies(nextState, atomState, dependencies)
  return nextState
}

const setAtomReadError = <Value>(
  state: State,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom>,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  if (promise && promise !== atomState.p) {
    return state
  }
  delete atomState.p
  atomState.e = error
  replaceDependencies(nextState, atomState, dependencies)
  return nextState
}

const setAtomReadPromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  atomState.p = promise
  replaceDependencies(nextState, atomState, dependencies)
  return nextState
}

const setAtomWritePromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  if (promise) {
    atomState.w = promise
  } else {
    delete atomState.w
  }
  return nextState
}

const scheduleReadAtomState = <Value>(
  updateState: UpdateState,
  atom: Atom<Value>,
  promise: Promise<unknown>
) => {
  promise.then(() => {
    updateState((prev) => readAtomState(prev, updateState, atom, true)[1])
  })
}

const readAtomState = <Value>(
  state: State,
  updateState: UpdateState,
  atom: Atom<Value>,
  force?: boolean
): readonly [AtomState<Value>, State] => {
  if (!force) {
    const atomState = getAtomState(state, atom)
    if (
      atomState &&
      Array.from(atomState.d.entries()).every(([a, r]) => {
        const aState = getAtomState(state, a)
        return aState && !aState.e && !aState.p && aState.r === r
      })
    ) {
      return [atomState, state] as const
    }
  }
  let asyncState = { ...state, w: new Map() } // empty wip
  let isSync = true
  let nextState = state
  let error: Error | undefined
  let promise: Promise<void> | undefined
  let value: Value | undefined
  const dependencies = new Set<AnyAtom>()
  try {
    const promiseOrValue = atom.read(((a: AnyAtom) => {
      dependencies.add(a)
      if (a !== atom) {
        let aState: AtomState
        if (isSync) {
          ;[aState, nextState] = readAtomState(nextState, updateState, a)
        } else {
          ;[aState, asyncState] = readAtomState(asyncState, updateState, a)
        }
        if (aState.e) {
          throw aState.e // read error
        }
        if (aState.p) {
          throw aState.p // read promise
        }
        return aState.v // value
      }
      // a === atom
      const aState = getAtomState(nextState, a)
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
          updateState((prev) =>
            setAtomValue(
              copyWip(prev, asyncState),
              atom,
              value,
              dependencies,
              promise as Promise<void>
            )
          )
        })
        .catch((e) => {
          if (e instanceof Promise) {
            scheduleReadAtomState(updateState, atom, e)
            return e
          }
          updateState((prev) =>
            setAtomReadError(
              copyWip(prev, asyncState),
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
      scheduleReadAtomState(updateState, atom, errorOrPromise)
      promise = errorOrPromise
    } else if (errorOrPromise instanceof Error) {
      error = errorOrPromise
    } else {
      error = new Error(errorOrPromise)
    }
  }
  if (error) {
    nextState = setAtomReadError(nextState, atom, error, dependencies)
  } else if (promise) {
    nextState = setAtomReadPromise(nextState, atom, promise, dependencies)
  } else {
    nextState = setAtomValue(nextState, atom, value, dependencies)
  }
  isSync = false
  return [getAtomState(nextState, atom) as AtomState<Value>, nextState] as const
}

export const readAtom = <Value>(
  state: State,
  updateState: UpdateState,
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const [atomState, nextState] = readAtomState(state, updateState, readingAtom)
  // merge back wip
  nextState.w.forEach((atomState, atom) => {
    state.w.set(atom, atomState)
  })
  // schedule commit
  updateState((prev) => {
    commitState(prev, updateState)
    return prev
  })
  return atomState
}

export const addAtom = (
  state: State,
  updateState: UpdateState,
  addingAtom: AnyAtom,
  useId: symbol
): Mounted => {
  let mounted = state.m.get(addingAtom)
  if (mounted) {
    const dependents = mounted.d
    dependents.add(useId)
  } else {
    mounted = mountAtom(state, updateState, addingAtom, useId)
  }
  commitState(state, updateState)
  return mounted
}

// XXX doesn't work with mutally dependent atoms
const canUnmountAtom = (atom: AnyAtom, dependents: Dependents) =>
  !dependents.size || (dependents.size === 1 && dependents.has(atom))

export const delAtom = (
  state: State,
  updateState: UpdateState,
  deletingAtom: AnyAtom,
  useId: symbol
): void => {
  const mounted = state.m.get(deletingAtom)
  if (mounted) {
    const dependents = mounted.d
    dependents.delete(useId)
    if (canUnmountAtom(deletingAtom, dependents)) {
      unmountAtom(state, deletingAtom)
    }
  }
  commitState(state, updateState)
}

const getDependents = (state: State, atom: AnyAtom): Dependents => {
  const mounted = state.m.get(atom)
  const dependents: Dependents = new Set(mounted?.d)
  // collecting from wip
  state.w.forEach((aState, a) => {
    if (aState.d.has(atom)) {
      dependents.add(a)
    }
  })
  return dependents
}

const updateDependentsState = <Value>(
  state: State,
  updateState: UpdateState,
  atom: Atom<Value>,
  prevAtomState?: AtomState<Value>
): State => {
  if (!prevAtomState || prevAtomState.r === getAtomState(state, atom)?.r) {
    return state // bail out
  }
  const dependents = getDependents(state, atom)
  let nextState = state
  dependents.forEach((dependent) => {
    if (dependent === atom || typeof dependent === 'symbol') {
      return
    }
    const dependentState = getAtomState(nextState, dependent)
    const [nextDependentState, nextNextState] = readAtomState(
      nextState,
      updateState,
      dependent,
      true
    )
    const promise = nextDependentState.p
    if (promise) {
      promise.then(() => {
        updateState((prev) =>
          updateDependentsState(prev, updateState, dependent, dependentState)
        )
      })
      nextState = nextNextState
    } else {
      nextState = updateDependentsState(
        nextNextState,
        updateState,
        dependent,
        dependentState
      )
    }
  })
  return nextState
}

const writeAtomState = <Value, Update>(
  state: State,
  updateState: UpdateState,
  atom: WritableAtom<Value, Update>,
  update: Update,
  pendingPromises?: Promise<void>[]
): State => {
  const atomState = getAtomState(state, atom)
  if (atomState && atomState.w) {
    const promise = atomState.w.then(() => {
      updateState((prev) => writeAtomState(prev, updateState, atom, update))
    })
    if (pendingPromises) {
      pendingPromises.push(promise)
    }
    return state
  }
  let nextState = state
  let isSync = true
  try {
    const promiseOrVoid = atom.write(
      ((a: AnyAtom) => {
        // We pass dummy updateState and throw away nextState.
        // There might be a better implementation.
        const [aState] = readAtomState(nextState, () => {}, a)
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
          const aState = getAtomState(nextState, a)
          if (isSync) {
            nextState = updateDependentsState(
              setAtomValue(nextState, a, v),
              updateState,
              a,
              aState
            )
          } else {
            updateState((prev) =>
              updateDependentsState(
                setAtomValue(prev, a, v),
                updateState,
                a,
                aState
              )
            )
          }
        } else {
          if (isSync) {
            nextState = writeAtomState(nextState, updateState, a, v)
          } else {
            updateState((prev) => writeAtomState(prev, updateState, a, v))
          }
        }
      }) as Setter,
      update
    )
    if (promiseOrVoid instanceof Promise) {
      if (pendingPromises) {
        pendingPromises.push(promiseOrVoid)
      }
      nextState = setAtomWritePromise(
        nextState,
        atom,
        promiseOrVoid.then(() => {
          updateState((prev) => {
            const next = setAtomWritePromise(prev, atom)
            commitState(next, updateState)
            return next
          })
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
  isSync = false
  return nextState
}

export const writeAtom = <Value, Update>(
  updateState: UpdateState,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void | Promise<void> => {
  const pendingPromises: Promise<void>[] = []

  updateState((prev) => {
    const next = writeAtomState(
      prev,
      updateState,
      writingAtom,
      update,
      pendingPromises
    )
    commitState(next, updateState)
    return next
  })

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
  updateState: UpdateState,
  atom: AnyAtom,
  initialDependent: AnyAtom | symbol
): Mounted => {
  // mount dependencies beforehand
  const atomState = getAtomState(state, atom)
  if (atomState) {
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        // check if not mounted
        if (!state.m.has(a)) {
          mountAtom(state, updateState, a, atom)
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
  let onUmount: OnUnmount | void
  if (isActuallyWritableAtom(atom) && atom.onMount) {
    const setAtom = (update: unknown) => writeAtom(updateState, atom, update)
    onUmount = atom.onMount(setAtom)
  }
  const mounted: Mounted = {
    d: new Set([initialDependent]),
    l: new Set(),
    u: onUmount,
  }
  state.m.set(atom, mounted)
  return mounted
}

const unmountAtom = (state: State, atom: AnyAtom): void => {
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
      atomState.p &&
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] deleting atomState with read promise', atom)
    }
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const dependents = state.m.get(a)?.d
        if (dependents) {
          dependents.delete(atom)
          if (canUnmountAtom(a, dependents)) {
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

const commitState = (state: State, updateState: UpdateState) => {
  if (state.w.size) {
    // apply wip to MountedMap
    state.w.forEach((atomState, atom) => {
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
            const dependents = mounted.d
            dependents.delete(atom)
            if (canUnmountAtom(a, dependents)) {
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
          mountAtom(state, updateState, a, atom)
        }
      })
    })
    // copy wip to AtomStateMap
    state.w.forEach((atomState, atom) => {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
    })
    // empty wip
    state.w.clear()
  }
}

export const subscribeAtom = (
  state: State,
  updateState: UpdateState,
  atom: AnyAtom,
  callback: () => void
) => {
  const id = Symbol()
  const mounted = addAtom(state, updateState, atom, id)
  const listeners = mounted.l
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
    delAtom(state, updateState, atom, id)
  }
}

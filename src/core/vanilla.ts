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

// immutable atom state
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

// mutable state
export type State = {
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  w: WorkInProgress
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    v: 0,
    a: new WeakMap(),
    m: new Map(),
    w: new Map(),
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

const wipAtomState = <Value>(
  state: State,
  atom: Atom<Value>
): AtomState<Value> => {
  let atomState = getAtomState(state, atom)
  if (atomState) {
    atomState = { ...atomState } // copy
  } else {
    atomState = { r: 0, d: new Map() }
    if (hasInitialValue(atom)) {
      atomState.v = atom.init
    }
  }
  state.w.set(atom, atomState)
  return atomState
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
): void => {
  const atomState = wipAtomState(state, atom)
  if (promise && promise !== atomState.p) {
    return
  }
  delete atomState.e
  delete atomState.p
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r
  }
  replaceDependencies(state, atomState, dependencies)
}

const setAtomReadError = <Value>(
  state: State,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom>,
  promise?: Promise<void>
): void => {
  const atomState = wipAtomState(state, atom)
  if (promise && promise !== atomState.p) {
    return
  }
  delete atomState.p
  atomState.e = error
  replaceDependencies(state, atomState, dependencies)
}

const setAtomReadPromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom>
): void => {
  const atomState = wipAtomState(state, atom)
  atomState.p = promise
  replaceDependencies(state, atomState, dependencies)
}

const setAtomWritePromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise?: Promise<void>
): void => {
  const atomState = wipAtomState(state, atom)
  if (promise) {
    atomState.w = promise
  } else {
    delete atomState.w
  }
}

const scheduleReadAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<unknown>
): void => {
  promise.then(() => {
    readAtomState(state, atom, true)
    commitState(state)
  })
}

const readAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  force?: boolean
): AtomState<Value> => {
  if (!force) {
    const atomState = getAtomState(state, atom)
    if (
      atomState &&
      Array.from(atomState.d.entries()).every(([a, r]) => {
        const aState = getAtomState(state, a)
        return aState && !aState.e && !aState.p && aState.r === r
      })
    ) {
      return atomState
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
  return atomState
}

const addAtom = (state: State, addingAtom: AnyAtom, useId: symbol): Mounted => {
  let mounted = state.m.get(addingAtom)
  if (mounted) {
    const dependents = mounted.d
    dependents.add(useId)
  } else {
    mounted = mountAtom(state, addingAtom, useId)
  }
  return mounted
}

// XXX doesn't work with mutally dependent atoms
const canUnmountAtom = (atom: AnyAtom, dependents: Dependents) =>
  !dependents.size || (dependents.size === 1 && dependents.has(atom))

const delAtom = (state: State, deletingAtom: AnyAtom, useId: symbol): void => {
  const mounted = state.m.get(deletingAtom)
  if (mounted) {
    const dependents = mounted.d
    dependents.delete(useId)
    if (canUnmountAtom(deletingAtom, dependents)) {
      unmountAtom(state, deletingAtom)
    }
  }
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
  atom: Atom<Value>,
  prevAtomState?: AtomState<Value>
): void => {
  if (!prevAtomState || prevAtomState.r === getAtomState(state, atom)?.r) {
    return // bail out
  }
  const dependents = getDependents(state, atom)
  dependents.forEach((dependent) => {
    if (dependent === atom || typeof dependent === 'symbol') {
      return
    }
    const dependentState = getAtomState(state, dependent)
    const nextDependentState = readAtomState(state, dependent, true)
    const promise = nextDependentState.p
    if (promise) {
      promise.then(() => {
        updateDependentsState(state, dependent, dependentState)
      })
    } else {
      updateDependentsState(state, dependent, dependentState)
    }
  })
}

const writeAtomState = <Value, Update>(
  state: State,
  atom: WritableAtom<Value, Update>,
  update: Update,
  pendingPromises?: Promise<void>[]
): void => {
  const atomState = getAtomState(state, atom)
  if (atomState && atomState.w) {
    const promise = atomState.w.then(() => {
      writeAtomState(state, atom, update)
      commitState(state)
    })
    if (pendingPromises) {
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
          const aState = getAtomState(state, a)
          setAtomValue(state, a, v)
          updateDependentsState(state, a, aState)
        } else {
          writeAtomState(state, a, v)
        }
      }) as Setter,
      update
    )
    if (promiseOrVoid instanceof Promise) {
      if (pendingPromises) {
        pendingPromises.push(promiseOrVoid)
      }
      setAtomWritePromise(
        state,
        atom,
        promiseOrVoid.then(() => {
          setAtomWritePromise(state, atom)
          commitState(state)
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
}

export const writeAtom = <Value, Update>(
  state: State,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void | Promise<void> => {
  const pendingPromises: Promise<void>[] = []

  writeAtomState(state, writingAtom, update, pendingPromises)
  commitState(state)

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
  let onUmount: OnUnmount | void
  if (isActuallyWritableAtom(atom) && atom.onMount) {
    const setAtom = (update: unknown) => writeAtom(state, atom, update)
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

const commitState = (state: State) => {
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
          mountAtom(state, a, atom)
        }
      })
    })
    // copy wip to AtomStateMap
    const updatedAtoms = new Set<AnyAtom>()
    state.w.forEach((atomState, atom) => {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
      updatedAtoms.add(atom)
    })
    // empty wip
    state.w.clear()
    // notify listeners
    ++state.v
    updatedAtoms.forEach((updatedAtom) => {
      const mounted = state.m.get(updatedAtom)
      mounted?.l.forEach((listener) => listener())
    })
  }
}

export const subscribeAtom = (
  state: State,
  atom: AnyAtom,
  callback: () => void
) => {
  const id = Symbol()
  const mounted = addAtom(state, atom, id)
  const listeners = mounted.l
  listeners.add(callback)
  commitState(state)
  return () => {
    listeners.delete(callback)
    delAtom(state, atom, id)
  }
}

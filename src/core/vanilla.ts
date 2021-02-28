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

type UpdateWip = (updater: (prev: WorkInProgress) => WorkInProgress) => void

// mutable state
export type State = {
  v: StateVersion
  a: AtomStateMap
  m: MountedMap
  u: UpdateWip
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    v: 0,
    a: new WeakMap(),
    m: new Map(),
    u: () => {},
  }
  type Updater = Parameters<UpdateWip>[0]
  let currWip: WorkInProgress = new Map()
  const queue: Updater[] = []
  state.u = (updater: Updater) => {
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
      commitState(state, currWip)
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

const getAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
) => (wip.get(atom) || state.a.get(atom)) as AtomState<Value> | undefined

const wipAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>
): readonly [AtomState<Value>, WorkInProgress] => {
  let atomState = getAtomState(state, wip, atom)
  if (atomState) {
    atomState = { ...atomState } // copy
  } else {
    atomState = { r: 0, d: new Map() }
    if (hasInitialValue(atom)) {
      atomState.v = atom.init
    }
  }
  const nextWip = new Map(wip).set(atom, atomState) // copy
  return [atomState, nextWip] as const
}

const replaceDependencies = (
  state: State,
  wip: WorkInProgress,
  atomState: AtomState,
  dependencies?: Set<AnyAtom>
): void => {
  if (dependencies) {
    atomState.d = new Map(
      Array.from(dependencies).map((a) => [
        a,
        getAtomState(state, wip, a)?.r ?? 0,
      ])
    )
  }
}

const setAtomValue = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  value: Value,
  dependencies?: Set<AnyAtom>,
  promise?: Promise<void>
): WorkInProgress => {
  const [atomState, nextWip] = wipAtomState(state, wip, atom)
  if (promise && promise !== atomState.p) {
    return wip
  }
  delete atomState.e
  delete atomState.p
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    ++atomState.r
  }
  replaceDependencies(state, nextWip, atomState, dependencies)
  return nextWip
}

const setAtomReadError = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom>,
  promise?: Promise<void>
): WorkInProgress => {
  const [atomState, nextWip] = wipAtomState(state, wip, atom)
  if (promise && promise !== atomState.p) {
    return wip
  }
  delete atomState.p
  atomState.e = error
  replaceDependencies(state, nextWip, atomState, dependencies)
  return nextWip
}

const setAtomReadPromise = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom>
): WorkInProgress => {
  const [atomState, nextWip] = wipAtomState(state, wip, atom)
  atomState.p = promise
  replaceDependencies(state, nextWip, atomState, dependencies)
  return nextWip
}

const setAtomWritePromise = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  promise?: Promise<void>
): WorkInProgress => {
  const [atomState, nextWip] = wipAtomState(state, wip, atom)
  if (promise) {
    atomState.w = promise
  } else {
    delete atomState.w
  }
  return nextWip
}

const scheduleReadAtomState = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<unknown>
): void => {
  promise.then(() => {
    state.u((wip) => readAtomState(state, wip, atom, true)[1])
  })
}

const readAtomState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  force?: boolean
): readonly [AtomState<Value>, WorkInProgress] => {
  if (!force) {
    const atomState = getAtomState(state, wip, atom)
    if (
      atomState &&
      Array.from(atomState.d.entries()).every(([a, r]) => {
        const aState = getAtomState(state, wip, a)
        return aState && !aState.e && !aState.p && aState.r === r
      })
    ) {
      return [atomState, wip] as const
    }
  }
  let asyncWip: WorkInProgress = new Map() // empty wip
  let isSync = true
  let nextWip = wip
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
          ;[aState, nextWip] = readAtomState(state, nextWip, a)
        } else {
          ;[aState, asyncWip] = readAtomState(state, asyncWip, a)
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
      const aState = getAtomState(state, nextWip, a)
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
              new Map([...prev, ...asyncWip]),
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
              new Map([...prev, ...asyncWip]),
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
    nextWip = setAtomReadError(state, nextWip, atom, error, dependencies)
  } else if (promise) {
    nextWip = setAtomReadPromise(state, nextWip, atom, promise, dependencies)
  } else {
    nextWip = setAtomValue(state, nextWip, atom, value, dependencies)
  }
  isSync = false
  return [
    getAtomState(state, nextWip, atom) as AtomState<Value>,
    nextWip,
  ] as const
}

export const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const [atomState, wip] = readAtomState(state, new Map(), readingAtom)
  // schedule commit
  state.u((prev) => {
    commitState(state, wip)
    return prev
  })
  return atomState
}

const addAtom = (state: State, addingAtom: AnyAtom, useId: symbol): Mounted => {
  let mounted = state.m.get(addingAtom)
  if (mounted) {
    const dependents = mounted.d
    dependents.add(useId)
  } else {
    mounted = mountAtom(state, new Map(), addingAtom, useId)
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
      unmountAtom(state, new Map(), deletingAtom)
    }
  }
}

const getDependents = (state: State, atom: AnyAtom): Dependents => {
  const mounted = state.m.get(atom)
  const dependents: Dependents = new Set(mounted?.d)
  return dependents
}

const updateDependentsState = <Value>(
  state: State,
  wip: WorkInProgress,
  atom: Atom<Value>,
  prevAtomState?: AtomState<Value>
): WorkInProgress => {
  if (!prevAtomState || prevAtomState.r === getAtomState(state, wip, atom)?.r) {
    return wip // bail out
  }
  const dependents = getDependents(state, atom)
  let nextWip = wip
  dependents.forEach((dependent) => {
    if (dependent === atom || typeof dependent === 'symbol') {
      return
    }
    const dependentState = getAtomState(state, nextWip, dependent)
    const [nextDependentState, nextNextWip] = readAtomState(
      state,
      nextWip,
      dependent,
      true
    )
    const promise = nextDependentState.p
    if (promise) {
      promise.then(() => {
        state.u((prev) =>
          updateDependentsState(state, prev, dependent, dependentState)
        )
      })
      nextWip = nextNextWip
    } else {
      nextWip = updateDependentsState(
        state,
        nextNextWip,
        dependent,
        dependentState
      )
    }
  })
  return nextWip
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
  let nextWip = wip
  let isSync = true
  try {
    const promiseOrVoid = atom.write(
      ((a: AnyAtom) => {
        const [aState] = readAtomState(state, nextWip, a)
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
          const aState = getAtomState(state, nextWip, a)
          if (isSync) {
            nextWip = updateDependentsState(
              state,
              setAtomValue(state, nextWip, a, v),
              a,
              aState
            )
          } else {
            state.u((prev) =>
              updateDependentsState(
                state,
                setAtomValue(state, prev, a, v),
                a,
                aState
              )
            )
          }
        } else {
          if (isSync) {
            nextWip = writeAtomState(state, nextWip, a, v)
          } else {
            state.u((prev) => writeAtomState(state, prev, a, v))
          }
        }
      }) as Setter,
      update
    )
    if (promiseOrVoid instanceof Promise) {
      if (pendingPromises) {
        pendingPromises.push(promiseOrVoid)
      }
      nextWip = setAtomWritePromise(
        state,
        nextWip,
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
  isSync = false
  return nextWip
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
  initialDependent: AnyAtom | symbol
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
    d: new Set([initialDependent]),
    l: new Set(),
    u: undefined,
  }
  state.m.set(atom, mounted)
  state.u((prev) => {
    if (isActuallyWritableAtom(atom) && atom.onMount) {
      const setAtom = (update: unknown) => writeAtom(state, atom, update)
      mounted.u = atom.onMount(setAtom)
      commitState(state, prev)
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
        const dependents = state.m.get(a)?.d
        if (dependents) {
          dependents.delete(atom)
          if (canUnmountAtom(a, dependents)) {
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

const commitState = (state: State, wip: WorkInProgress) => {
  if (wip.size) {
    // apply wip to MountedMap
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
            const dependents = mounted.d
            dependents.delete(atom)
            if (canUnmountAtom(a, dependents)) {
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
    // copy wip to AtomStateMap
    wip.forEach((atomState, atom) => {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
    })
    // empty wip
    wip.clear()
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
  return () => {
    listeners.delete(callback)
    delAtom(state, atom, id)
  }
}

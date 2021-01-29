import {
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

export type AtomState<Value = unknown> = {
  re?: Error // read error
  rp?: Promise<void> // read promise
  wp?: Promise<void> // write promise
  v?: Value
  r: Revision
  d: ReadDependencies
}

type AtomStateMap = WeakMap<AnyAtom, AtomState>

type UseAtomSymbol = symbol
type Dependents = Set<AnyAtom | UseAtomSymbol>
type MountedMap = Map<AnyAtom, [Dependents] | [Dependents, OnUnmount | void]>
type MountPendingSet = Set<AnyAtom> // after mount
type UnmountPendingSet = Set<AnyAtom> // before unmount

type WorkInProgress = Map<AnyAtom, AtomState>

type UpdateState = (updater: (prev: State) => State) => void

// The state consists of mutable parts and wip part
// Mutable parts can only be modified with
// addAtom/delAtom/applyWip/commit in React commit phase
export type State = {
  a: AtomStateMap // mutable state
  m: MountedMap // mutable state
  p: MountPendingSet // mutable state
  u: UnmountPendingSet // mutable state
  w: WorkInProgress // wip state (mutable only within the same render)
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    a: new WeakMap(),
    m: new Map(),
    p: new Set(),
    u: new Set(),
    w: new Map(),
  }
  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState = { v: value, r: 0, d: new Map() }
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

const copyWip = (state: State, copyingState: State): State => {
  if (
    state.w.size &&
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[Bug] wip not empty')
  }
  return {
    ...state,
    w: copyingState.w,
  }
}

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
  if (promise && promise !== atomState.rp) {
    return state
  }
  delete atomState.re
  delete atomState.rp
  if (!('v' in atomState) || !Object.is(atomState.v, value)) {
    atomState.v = value
    atomState.r++
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
  if (promise && promise !== atomState.rp) {
    return state
  }
  delete atomState.rp
  atomState.re = error
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
  atomState.rp = promise
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
    atomState.wp = promise
  } else {
    delete atomState.wp
  }
  return nextState
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
        return aState && !aState.re && !aState.rp && aState.r === r
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
        if (aState.re) {
          throw aState.re // read error
        }
        if (aState.rp) {
          throw aState.rp // read promise
        }
        return aState.v // value
      }
      // a === atom
      const aState = getAtomState(nextState, a)
      if (aState) {
        if (aState.rp) {
          throw aState.rp // read promise
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
      promise = errorOrPromise.then(() => {
        updateState((prev) => {
          const [, nextNextState] = readAtomState(prev, updateState, atom, true)
          if (nextNextState.w.size) {
            return nextNextState
          }
          return prev
        })
      })
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
  return atomState
}

export const addAtom = (
  state: State,
  addingAtom: AnyAtom,
  useId: symbol
): void => {
  const mounted = state.m.get(addingAtom)
  if (mounted) {
    const [dependents] = mounted
    dependents.add(useId)
  } else {
    state.m.set(addingAtom, [new Set([useId])])
    state.p.add(addingAtom)
  }
}

const canUnmountAtom = (atom: AnyAtom, dependents: Dependents) =>
  !dependents.size || (dependents.size === 1 && dependents.has(atom))

export const delAtom = (
  state: State,
  deletingAtom: AnyAtom,
  useId: symbol
): void => {
  const mounted = state.m.get(deletingAtom)
  if (mounted) {
    const [dependents] = mounted
    dependents.delete(useId)
    if (canUnmountAtom(deletingAtom, dependents)) {
      unmountAtom(state, deletingAtom)
    }
  }
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
  const mounted = state.m.get(atom)
  if (!mounted) {
    // not mounted
    // this may happen if async function is resolved before commit.
    // not certain this is going to be an issue in some cases.
    return state
  }
  let nextState = state
  const [dependents] = mounted
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
    const promise = nextDependentState.rp
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
  if (atomState && atomState.wp) {
    const promise = atomState.wp.then(() => {
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
        const aState = getAtomState(nextState, a)
        if (!aState) {
          if (hasInitialValue(a)) {
            return a.init
          }
          if (
            typeof process === 'object' &&
            process.env.NODE_ENV !== 'production'
          ) {
            console.warn(
              'Unable to read an atom without initial value in write function. Please useAtom in advance.',
              a
            )
          }
          throw new Error('uninitialized atom')
        }
        if (
          aState.rp &&
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          // TODO will try to detect this
          console.warn(
            'Reading pending atom state in write operation. We need to detect this and fallback. Please file an issue with repro.',
            a
          )
        }
        return aState.v
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
          updateState((prev) => setAtomWritePromise(prev, atom))
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
    const nextState = writeAtomState(
      prev,
      updateState,
      writingAtom,
      update,
      pendingPromises
    )
    return nextState
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

const updateDependentsMap = (state: State): void => {
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
          const [dependents] = mounted
          dependents.delete(atom)
          if (!dependents.size) {
            state.u.add(a)
          }
        } else if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn('[Bug] a dependency is not mounted')
        }
      })
    }
    dependencies.forEach((a) => {
      const mounted = state.m.get(a)
      if (mounted) {
        const [dependents] = mounted
        dependents.add(atom)
      } else {
        state.m.set(a, [new Set([atom])])
        state.p.add(a)
      }
    })
  })
}

// apply wip
export const applyWip = (state: State) => {
  if (state.w.size) {
    updateDependentsMap(state)
    state.w.forEach((atomState, atom) => {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
    })
    state.w.clear()
  }
}

const unmountAtom = (state: State, atom: AnyAtom) => {
  const atomState = getAtomState(state, atom)
  if (atomState) {
    if (
      atomState.rp &&
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn('[Bug] deleting atomState with read promise', atom)
    }
    atomState.d.forEach((_, a) => {
      if (a !== atom) {
        const dependents = state.m.get(a)?.[0]
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
    console.warn('[Bug] could not find atom state to delete', atom)
  }
  const onUnmount = state.m.get(atom)?.[1]
  if (onUnmount) {
    onUnmount()
  }
  state.m.delete(atom)
}

const isActuallyWritableAtom = (atom: AnyAtom): atom is AnyWritableAtom =>
  !!(atom as AnyWritableAtom).write

// commit (mount atoms)
export const commit = (state: State, updateState: UpdateState) => {
  // process unmoumnt pending
  state.u.forEach((atom) => {
    unmountAtom(state, atom)
  })
  state.u.clear()

  // process handle mount pending
  state.p.forEach((atom) => {
    const mounted = state.m.get(atom)
    if (mounted) {
      if (
        mounted.length !== 1 &&
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn('[Bug] mounting already mounted atom', atom)
      }
      if (isActuallyWritableAtom(atom) && atom.onMount) {
        const setAtom = (update: unknown) =>
          writeAtom(updateState, atom, update)
        mounted[1] = atom.onMount(setAtom)
      } else {
        mounted[1] = undefined
      }
    }
  })
  state.p.clear()
}

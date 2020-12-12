import {
  Atom,
  WritableAtom,
  AnyAtom,
  AnyWritableAtom,
  Getter,
  Setter,
} from './types'

const INIT = 'init'

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
type DependentsMap = Map<AnyAtom, Set<AnyAtom | UseAtomSymbol>>

type WorkInProgress = Map<AnyAtom, AtomState>

type UpdateState = (updater: (prev: State) => State) => void

// The state consists of mutable parts and wip part
// Mutable parts can only be modified with addAtom/delAtom/commitState in React commit phase
export type State = {
  a: AtomStateMap // mutable state
  m: DependentsMap // mutable state
  w: WorkInProgress // wip state (mutable only within the same render)
}

export const createState = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    a: new WeakMap(),
    m: new Map(),
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
    if (INIT in atom) {
      atomState.v = (atom as { init?: Value }).init
    }
  }
  const nextState = {
    ...state,
    w: new Map(state.w).set(atom, atomState), // copy
  }
  return [atomState, nextState] as const
}

const addDependency = <Value>(
  state: State,
  atom: Atom<Value>,
  dependency: AnyAtom
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  const dependencyState = getAtomState(state, dependency)
  if (atomState) {
    if (dependencyState && atomState.d.get(dependency) === dependencyState.r) {
      return state
    } else {
      atomState.d = new Map(atomState.d).set(
        dependency,
        dependencyState?.r ?? 0
      )
      atomState.r++
    }
  } else if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[Bug] add dependency failed', atom)
  }
  return nextState
}

const replaceDependencies = (
  state: State,
  atomState: AtomState,
  dependencies: Set<AnyAtom> | false
): void => {
  if (dependencies) {
    atomState.d = new Map(
      [...dependencies].map((a) => [a, getAtomState(state, a)?.r ?? 0])
    )
  }
}

const setAtomValue = <Value>(
  state: State,
  atom: Atom<Value>,
  value: Value,
  dependencies: Set<AnyAtom> | false,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  if (promise && promise !== atomState.rp) {
    return state
  }
  delete atomState.re
  delete atomState.rp
  atomState.v = value
  atomState.r++
  replaceDependencies(nextState, atomState, dependencies)
  return nextState
}

const setAtomReadError = <Value>(
  state: State,
  atom: Atom<Value>,
  error: Error,
  dependencies: Set<AnyAtom> | false,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  if (promise && promise !== atomState.rp) {
    return state
  }
  delete atomState.rp
  atomState.re = error
  atomState.r++
  replaceDependencies(nextState, atomState, dependencies)
  return nextState
}

const setAtomReadPromise = <Value>(
  state: State,
  atom: Atom<Value>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom> | false
): State => {
  const [atomState, nextState] = wipAtomState(state, atom)
  atomState.rp = promise
  atomState.r++
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
  atomState.r++
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
      [...atomState.d.entries()].every(
        ([a, r]) => getAtomState(state, a)?.r === r
      )
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
  let dependencies: Set<AnyAtom> | null = new Set()
  let flushDependencies = false
  try {
    const promiseOrValue = atom.read(((a: AnyAtom) => {
      if (dependencies) {
        dependencies.add(a)
      }
      if (!isSync) {
        updateState((prev) => addDependency(prev, atom, a))
      }
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
      if (INIT in a) {
        return (a as { init?: unknown }).init
      }
      throw new Error('no atom init')
    }) as Getter)
    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then((value) => {
          const dependenciesToReplace = dependencies as Set<AnyAtom>
          dependencies = null
          updateState((prev) =>
            setAtomValue(
              copyWip(prev, asyncState),
              atom,
              value,
              dependenciesToReplace,
              promise as Promise<void>
            )
          )
        })
        .catch((e) => {
          const dependenciesToReplace = dependencies as Set<AnyAtom>
          dependencies = null
          updateState((prev) =>
            setAtomReadError(
              copyWip(prev, asyncState),
              atom,
              e instanceof Error ? e : new Error(e),
              dependenciesToReplace,
              promise as Promise<void>
            )
          )
        })
    } else {
      value = promiseOrValue
      flushDependencies = true
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
    flushDependencies = true
  }
  if (error) {
    nextState = setAtomReadError(
      nextState,
      atom,
      error,
      flushDependencies && dependencies
    )
  } else if (promise) {
    nextState = setAtomReadPromise(
      nextState,
      atom,
      promise,
      flushDependencies && dependencies
    )
  } else {
    nextState = setAtomValue(
      nextState,
      atom,
      value,
      flushDependencies && dependencies
    )
  }
  if (flushDependencies) {
    dependencies = null
  } else {
    // add dependency temporarily
    dependencies.forEach((dependency) => {
      nextState = addDependency(nextState, atom, dependency)
    })
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
  const dependents = state.m.get(addingAtom)
  if (dependents) {
    dependents.add(useId)
  } else {
    state.m.set(addingAtom, new Set([useId]))
  }
}

export const delAtom = (
  state: State,
  deletingAtom: AnyAtom,
  useId: symbol
): void => {
  const del = (atom: AnyAtom, dependent: AnyAtom | symbol) => {
    const dependents = state.m.get(atom)
    if (!dependents) {
      return
    }
    dependents.delete(dependent)
    if (!dependents.size) {
      state.m.delete(atom)
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
          del(a, atom)
        })
      } else if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn('[Bug] atomState not defined', atom)
      }
    }
  }
  del(deletingAtom, useId)
}

const updateDependentsState = <Value>(
  state: State,
  updateState: UpdateState,
  atom: Atom<Value>
): State => {
  const dependents = state.m.get(atom)
  if (!dependents) {
    // no dependents found
    // this may happen if async function is resolved before commit.
    // not certain this is going to be an issue in some cases.
    return state
  }
  let nextState = state
  dependents.forEach((dependent) => {
    if (
      dependent === atom ||
      typeof dependent === 'symbol' ||
      !getAtomState(nextState, dependent)
    ) {
      return
    }
    const [dependentState, nextNextState] = readAtomState(
      nextState,
      updateState,
      dependent,
      true
    )
    const promise = dependentState.rp
    if (promise) {
      promise.then(() => {
        updateState((prev) =>
          updateDependentsState(prev, updateState, dependent)
        )
      })
      nextState = nextNextState
    } else {
      nextState = updateDependentsState(nextNextState, updateState, dependent)
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
          if (
            typeof process === 'object' &&
            process.env.NODE_ENV !== 'production'
          ) {
            console.warn('[Bug] writeAtomState no state', a)
          }
          return (a as { init?: unknown }).init
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
          if (isSync) {
            nextState = updateDependentsState(
              setAtomValue(nextState, a, v, false),
              updateState,
              a
            )
          } else {
            updateState((prev) =>
              updateDependentsState(
                setAtomValue(prev, a, v, false),
                updateState,
                a
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
        const aDependents = state.m.get(a)
        if (dependencies.has(a)) {
          // not changed
          dependencies.delete(a)
        } else {
          const newDependents = new Set(aDependents)
          newDependents.delete(atom)
          state.m.set(a, newDependents)
        }
      })
    }
    dependencies.forEach((a) => {
      const aDependents = state.m.get(a)
      const newDependents = new Set(aDependents).add(atom)
      state.m.set(a, newDependents)
    })
  })
}

// commit wip
export const commitState = (state: State) => {
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

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

type SetState = (nextState: State) => void

export type State = {
  a: AtomStateMap
  m: DependentsMap
  w: WorkInProgress
  s: SetState
}

export const createState = (
  setState: SetState,
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): State => {
  const state: State = {
    a: new WeakMap(),
    m: new Map(),
    w: new Map(),
    s: setState,
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

const copyState = (state: State): State => {
  if (
    !state.w.size &&
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[Bug] wip not empty')
  }
  return {
    ...state,
    w: new Map(),
  }
}

const getAtomState = <Value>(state: State, atom: Atom<Value>) =>
  (state.w.get(atom) || state.a.get(atom)) as AtomState<Value> | undefined

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
      atomState.v = atom.init
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
  if (atomState && dependencyState) {
    if (atomState.d.get(dependency) === dependencyState.r) {
      return state
    } else {
      atomState.d = new Map(atomState.d).set(dependency, dependencyState.r)
      atomState.r++
    }
  } else if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn('[Bug] add dependency failed', atom, dependency)
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
  if (INIT in atom) {
    atomState.v = atom.init
  }
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
        const nextNextState = addDependency(copyState(state), atom, a)
        if (nextNextState.w.size) {
          state.s(nextNextState)
        }
      }
      if (a !== atom) {
        let aState: AtomState
        if (isSync) {
          ;[aState, nextState] = readAtomState(nextState, a)
        } else {
          const [aaState, nextNextState] = readAtomState(copyState(state), a)
          aState = aaState
          if (nextNextState.w.size) {
            state.s(nextNextState)
          }
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
      if (
        !(INIT in a) &&
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn('[Bug] init is not defined')
      }
      return a.init
    }) as Getter)
    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then((value) => {
          const nextNextState = setAtomValue(
            copyState(state),
            atom,
            value,
            dependencies as Set<AnyAtom>,
            promise as Promise<void>
          )
          dependencies = null
          if (nextNextState.w.size) {
            state.s(nextNextState)
          }
        })
        .catch((e) => {
          const nextNextState = setAtomReadError(
            copyState(state),
            atom,
            e instanceof Error ? e : new Error(e),
            dependencies as Set<AnyAtom>,
            promise as Promise<void>
          )
          dependencies = null
          if (nextNextState.w.size) {
            state.s(nextNextState)
          }
        })
    } else {
      value = promiseOrValue
      flushDependencies = true
    }
  } catch (errorOrPromise) {
    if (errorOrPromise instanceof Promise) {
      promise = errorOrPromise.then(() => {
        const [, nextNextState] = readAtomState(copyState(state), atom, true)
        if (nextNextState.w.size) {
          state.s(nextNextState)
        }
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
  readingAtom: Atom<Value>
): AtomState<Value> => {
  const [atomState] = readAtomState(state, readingAtom)
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
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        console.warn('[Bug] dependents not defined', atom)
      }
      return
    }
    dependents.delete(dependent)
    if (!dependents.size) {
      state.m.delete(atom)
      const atomState = state.a.get(atom)
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

const updateDependentsState = <Value>(state: State, atom: Atom<Value>) => {
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
      dependent,
      true
    )
    const promise = dependentState.rp
    if (promise) {
      promise.then(() => {
        const nextNextNextState = updateDependentsState(
          copyState(state),
          dependent
        )
        if (nextNextNextState.w.size) {
          state.s(nextNextNextState)
        }
      })
      nextState = nextNextState
    } else {
      nextState = updateDependentsState(nextNextState, dependent)
    }
  })
  return nextState
}

const writeAtomState = <Value, Update>(
  state: State,
  atom: WritableAtom<Value, Update>,
  update: Update,
  pendingPromises?: Promise<void>[]
): State => {
  const atomState = getAtomState(state, atom)
  if (atomState && atomState.wp) {
    const promise = atomState.wp.then(() => {
      const nextState = writeAtomState(copyState(state), atom, update)
      if (nextState.w.size) {
        state.s(nextState)
      }
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
          return a.init
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
              a
            )
          } else {
            const nextNextState = updateDependentsState(
              setAtomValue(copyState(state), a, v, false),
              a
            )
            if (nextNextState.w.size) {
              state.s(nextNextState)
            }
          }
        } else {
          if (isSync) {
            nextState = writeAtomState(nextState, a, v)
          } else {
            const nextNextState = writeAtomState(copyState(state), a, v)
            if (nextNextState.w.size) {
              state.s(nextNextState)
            }
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
          const nextNextState = setAtomWritePromise(copyState(state), atom)
          if (nextNextState.w.size) {
            state.s(nextNextState)
          }
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
  state: State,
  writingAtom: WritableAtom<Value, Update>,
  update: Update
): void | Promise<void> => {
  const pendingPromises: Promise<void>[] = []
  const nextState = writeAtomState(
    copyState(state),
    writingAtom,
    update,
    pendingPromises
  )
  if (nextState.w.size) {
    state.s(nextState)
  }

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

export const commitState = (state: State) => {
  if (state.w.size) {
    state.w.forEach((atomState, atom) => {
      if (
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        Object.freeze(atomState)
      }
      state.a.set(atom, atomState)
    })
    state.w = new Map()
  }
}

import React, {
  Dispatch,
  SetStateAction,
  MutableRefObject,
  ReactElement,
  createElement,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  useDebugValue,
} from 'react'
import {
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler'
import { useContextUpdate } from 'use-context-selector'

import {
  Atom,
  WritableAtom,
  AnyAtom,
  AnyWritableAtom,
  Getter,
  Setter,
  Scope,
} from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import {
  mCreate,
  mGet,
  mSet,
  mDel,
  mMerge,
  mForEach,
  mToPrintable,
} from './immutableMap'
import { AtomState, State, getContexts } from './contexts'

// guessing if it's react experimental channel
const isReactExperimental =
  !!(typeof process === 'object' && process.env.IS_REACT_EXPERIMENTAL) ||
  !!(React as any).unstable_useMutableSource

const useWeakMapRef = <T extends WeakMap<object, unknown>>() => {
  const ref = useRef<T>()
  if (!ref.current) {
    ref.current = new WeakMap() as T
  }
  return ref.current
}

const warnAtomStateNotFound = (info: string, atom: AnyAtom) => {
  console.warn(
    '[Bug] Atom state not found. Please file an issue with repro: ' + info,
    atom
  )
}

type DependentsMap = WeakMap<AnyAtom, Set<AnyAtom | symbol>> // symbol is id from useAtom

// we store last atom state before deleting from provider state
// and reuse it as long as it's not gc'd
type AtomStateCache = WeakMap<AnyAtom, AtomState>

// pending state for adding a new atom and write batching
type PendingStateMap = WeakMap<State, State> // the value is next state

type ContextUpdate = (t: () => void) => void

type WriteThunk = (lastState: State) => State // returns next state

const updateAtomState = <Value>(
  prevState: State,
  atom: Atom<Value>,
  partial: Partial<AtomState<Value>>,
  prevPromise?: Promise<void>,
  isNew?: boolean
): State => {
  let atomState = mGet(prevState, atom) as AtomState<Value> | undefined
  if (!atomState) {
    if (
      !isNew &&
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production'
    ) {
      warnAtomStateNotFound('updateAtomState', atom)
    }
    atomState = { rev: 0, deps: new Map() }
  }
  if (prevPromise && prevPromise !== atomState.readP) {
    return prevState
  }
  return mSet(prevState, atom, {
    ...atomState,
    ...partial,
    rev: atomState.rev + 1,
  })
}

const updateDependentsMap = (
  prevState: State,
  state: State,
  dependentsMap: DependentsMap
) => {
  mForEach(state, (atomState, atom) => {
    const prevDeps = mGet(prevState, atom)?.deps
    if (prevDeps === atomState.deps) {
      return
    }
    const dependencies = new Set(atomState.deps.keys())
    if (prevDeps) {
      prevDeps.forEach((_, a) => {
        const aDependents = dependentsMap.get(a)
        if (dependencies.has(a)) {
          // not changed
          dependencies.delete(a)
        } else {
          const newDependents = new Set(aDependents)
          dependentsMap.set(a, newDependents)
        }
      })
    }
    dependencies.forEach((a) => {
      const aDependents = dependentsMap.get(a)
      const newDependents = new Set(aDependents).add(atom)
      dependentsMap.set(a, newDependents)
    })
  })
}

const addDependency = (
  prevState: State,
  atom: AnyAtom,
  dependency: AnyAtom
): State => {
  let nextState = prevState
  const atomState = mGet(nextState, atom)
  const dependencyState = mGet(nextState, dependency)
  if (atomState && dependencyState) {
    const newDeps = new Map(atomState.deps).set(dependency, dependencyState.rev)
    nextState = mSet(nextState, atom, {
      ...atomState,
      deps: newDeps,
    })
  }
  return nextState
}

const replaceDependencies = (
  prevState: State,
  atom: AnyAtom,
  dependencies: Set<AnyAtom>
): State => {
  let nextState = prevState
  const atomState = mGet(nextState, atom)
  if (!atomState) {
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
      warnAtomStateNotFound('replaceDependencies.atomState', atom)
    }
    return prevState
  }
  nextState = mSet(nextState, atom, {
    ...atomState,
    deps: new Map(
      [...dependencies].map((a) => [a, mGet(nextState, a)?.rev ?? 0])
    ),
  })
  return nextState
}

const readAtomState = <Value>(
  prevState: State,
  atom: Atom<Value>,
  setState: Dispatch<(prev: State) => State>,
  atomStateCache: AtomStateCache,
  force?: boolean
): readonly [AtomState<Value>, State] => {
  if (!force) {
    let atomState = mGet(prevState, atom) as AtomState<Value> | undefined
    if (atomState) {
      return [atomState, prevState]
    }
    atomState = atomStateCache.get(atom) as AtomState<Value> | undefined
    if (
      atomState &&
      [...atomState.deps.entries()].every(
        ([a, r]) => mGet(prevState, a)?.rev === r
      )
    ) {
      return [atomState, mSet(prevState, atom, atomState)]
    }
  }
  let isSync = true
  let nextState = prevState
  let error: Error | undefined = undefined
  let promise: Promise<void> | undefined = undefined
  let value: Value | undefined = undefined
  let dependencies: Set<AnyAtom> | null = new Set()
  let flushDependencies = false
  try {
    const promiseOrValue = atom.read(((a: AnyAtom) => {
      if (dependencies) {
        dependencies.add(a)
      }
      if (!isSync) {
        setState((prev) => addDependency(prev, atom, a))
      }
      if (a !== atom) {
        const [aState, nextNextState] = readAtomState(
          nextState,
          a,
          setState,
          atomStateCache
        )
        if (isSync) {
          nextState = nextNextState
        } else {
          // XXX is this really correct?
          setState((prev) => mMerge(nextNextState, prev))
        }
        if (aState.readE) {
          throw aState.readE
        }
        if (aState.readP) {
          throw aState.readP
        }
        return aState.value
      }
      // a === atom
      const aState = mGet(nextState, a) || atomStateCache.get(a)
      if (aState) {
        if (aState.readP) {
          throw aState.readP
        }
        return aState.value
      }
      return a.init // this should not be undefined
    }) as Getter)
    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then((value) => {
          const dependenciesToReplace = dependencies as Set<AnyAtom>
          dependencies = null
          setState((prev) =>
            updateAtomState(
              replaceDependencies(prev, atom, dependenciesToReplace),
              atom,
              { readE: undefined, readP: undefined, value },
              promise
            )
          )
        })
        .catch((e) => {
          const dependenciesToReplace = dependencies as Set<AnyAtom>
          dependencies = null
          setState((prev) =>
            updateAtomState(
              replaceDependencies(prev, atom, dependenciesToReplace),
              atom,
              {
                readE: e instanceof Error ? e : new Error(e),
                readP: undefined,
              },
              promise
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
        setState(
          (prev) =>
            readAtomState(mDel(prev, atom), atom, setState, atomStateCache)[1]
        )
      })
    } else if (errorOrPromise instanceof Error) {
      error = errorOrPromise
    } else {
      error = new Error(errorOrPromise)
    }
    flushDependencies = true
  }
  nextState = updateAtomState(
    nextState,
    atom,
    {
      readE: error,
      readP: promise,
      value: promise ? atom.init : value,
    },
    undefined,
    true
  )
  if (flushDependencies) {
    nextState = replaceDependencies(nextState, atom, dependencies)
    dependencies = null
  } else {
    // add dependency temporarily
    dependencies.forEach((dependency) => {
      nextState = addDependency(nextState, atom, dependency)
    })
  }
  const atomState = mGet(nextState, atom) as AtomState<Value>
  isSync = false
  return [atomState, nextState] as const
}

const updateDependentsState = <Value>(
  prevState: State,
  atom: Atom<Value>,
  setState: Dispatch<(prev: State) => State>,
  dependentsMap: DependentsMap,
  atomStateCache: AtomStateCache
) => {
  const dependents = dependentsMap.get(atom)
  if (!dependents) {
    // no dependents found
    // this may happen if async function is resolved before commit.
    // not certain this is going to be an issue in some cases.
    return prevState
  }
  let nextState = prevState
  dependents.forEach((dependent) => {
    if (
      dependent === atom ||
      typeof dependent === 'symbol' ||
      !mGet(nextState, dependent)
    ) {
      return
    }
    const [dependentState, nextNextState] = readAtomState(
      nextState,
      dependent,
      setState,
      atomStateCache,
      true
    )
    const promise = dependentState.readP
    if (promise) {
      promise.then(() => {
        setState((prev) =>
          updateDependentsState(
            prev,
            dependent,
            setState,
            dependentsMap,
            atomStateCache
          )
        )
      })
      nextState = nextNextState
    } else {
      nextState = updateDependentsState(
        nextNextState,
        dependent,
        setState,
        dependentsMap,
        atomStateCache
      )
    }
  })
  return nextState
}

const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>,
  setState: Dispatch<SetStateAction<State>>,
  pendingStateMap: PendingStateMap,
  atomStateCache: AtomStateCache
) => {
  const prevState = pendingStateMap.get(state) || state
  const [atomState, nextState] = readAtomState(
    prevState,
    readingAtom,
    setState,
    atomStateCache
  )
  if (nextState !== prevState) {
    pendingStateMap.set(state, nextState)
  }
  return atomState
}

const addAtom = <Value>(
  id: symbol,
  addingAtom: Atom<Value>,
  dependentsMap: DependentsMap
) => {
  const dependents = dependentsMap.get(addingAtom)
  const newDependents = new Set(dependents).add(id)
  dependentsMap.set(addingAtom, newDependents)
}

const delAtom = <Value>(
  id: symbol,
  deletingAtom: Atom<Value>,
  dependentsMap: DependentsMap,
  atomStateCache: AtomStateCache,
  addWriteThunk: (thunk: WriteThunk) => void
) => {
  addWriteThunk((prev) => {
    let nextState = prev
    const del = (atom: AnyAtom, dependent: AnyAtom | symbol) => {
      const dependents = dependentsMap.get(atom)
      const newDependents = new Set(dependents)
      newDependents.delete(dependent)
      if (!newDependents.size) {
        dependentsMap.delete(atom)
        const atomState = mGet(nextState, atom)
        if (atomState) {
          if (
            atomState.readP &&
            typeof process === 'object' &&
            process.env.NODE_ENV !== 'production'
          ) {
            console.warn('[Bug] saving atomState with read promise', atom)
          }
          atomStateCache.set(atom, atomState)
          nextState = mDel(nextState, atom)
          atomState.deps.forEach((_, a) => {
            del(a, atom)
          })
        } else if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          warnAtomStateNotFound('delAtom', atom)
        }
      } else {
        dependentsMap.set(atom, newDependents)
      }
    }
    del(deletingAtom, id)
    return nextState
  })
}

const writeAtom = <Value, Update>(
  writingAtom: WritableAtom<Value, Update>,
  update: Update,
  setState: Dispatch<(prev: State) => State>,
  dependentsMap: DependentsMap,
  atomStateCache: AtomStateCache,
  addWriteThunk: (thunk: WriteThunk) => void
) => {
  const pendingPromises: Promise<void>[] = []

  const writeAtomState = <Value, Update>(
    prevState: State,
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => {
    const prevAtomState = mGet(prevState, atom)
    if (prevAtomState && prevAtomState.writeP) {
      const promise = prevAtomState.writeP.then(() => {
        addWriteThunk((prev) => writeAtomState(prev, atom, update))
      })
      pendingPromises.push(promise)
      return prevState
    }
    let nextState = prevState
    let isSync = true
    try {
      const promiseOrVoid = atom.write(
        ((a: AnyAtom) => {
          const aState = mGet(nextState, a) || atomStateCache.get(a)
          if (!aState) {
            if (
              typeof process === 'object' &&
              process.env.NODE_ENV !== 'production'
            ) {
              warnAtomStateNotFound('writeAtomState', a)
            }
            return a.init
          }
          if (
            aState.readP &&
            typeof process === 'object' &&
            process.env.NODE_ENV !== 'production'
          ) {
            // TODO will try to detect this
            console.warn(
              'Reading pending atom state in write operation. We need to detect this and fallback. Please file an issue with repro.',
              a
            )
          }
          return aState.value
        }) as Getter,
        ((a: AnyWritableAtom, v: unknown) => {
          if (a === atom) {
            const partialAtomState = {
              readE: undefined,
              readP: undefined,
              value: v,
            }
            if (isSync) {
              nextState = updateDependentsState(
                updateAtomState(nextState, a, partialAtomState),
                a,
                setState,
                dependentsMap,
                atomStateCache
              )
            } else {
              setState((prev) =>
                updateDependentsState(
                  updateAtomState(prev, a, partialAtomState),
                  a,
                  setState,
                  dependentsMap,
                  atomStateCache
                )
              )
            }
          } else {
            if (isSync) {
              nextState = writeAtomState(nextState, a, v)
            } else {
              addWriteThunk((prev) => writeAtomState(prev, a, v))
            }
          }
        }) as Setter,
        update
      )
      if (promiseOrVoid instanceof Promise) {
        pendingPromises.push(promiseOrVoid)
        nextState = updateAtomState(nextState, atom, {
          writeP: promiseOrVoid.then(() => {
            addWriteThunk((prev) =>
              updateAtomState(prev, atom, { writeP: undefined })
            )
          }),
        })
      }
    } catch (e) {
      if (pendingPromises.length) {
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

  let isSync = true
  let writeResolve: () => void
  const writePromise = new Promise<void>((resolve) => {
    writeResolve = resolve
  })
  pendingPromises.unshift(writePromise)
  addWriteThunk((prevState) => {
    if (isSync) {
      pendingPromises.shift()
    }
    const nextState = writeAtomState(prevState, writingAtom, update)
    if (!isSync) {
      writeResolve()
    }
    return nextState
  })
  isSync = false

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

const runWriteThunk = (
  lastStateRef: MutableRefObject<State>,
  isLastStateValidRef: MutableRefObject<boolean>,
  pendingStateMap: PendingStateMap,
  setState: Dispatch<State>,
  contextUpdate: ContextUpdate,
  writeThunkQueue: WriteThunk[]
) => {
  while (true) {
    if (!isLastStateValidRef.current || !writeThunkQueue.length) {
      return
    }
    const thunk = writeThunkQueue.shift() as WriteThunk
    const prevState =
      pendingStateMap.get(lastStateRef.current) || lastStateRef.current
    const nextState = thunk(prevState)
    if (nextState !== prevState) {
      pendingStateMap.set(lastStateRef.current, nextState)
      Promise.resolve().then(() => {
        const pendingState = pendingStateMap.get(lastStateRef.current)
        if (pendingState) {
          pendingStateMap.delete(lastStateRef.current)
          contextUpdate(() => {
            setState(pendingState)
          })
        }
      })
    }
  }
}

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
  c: ReturnType<typeof getContexts>[1]
}> = ({ r, c, children }) => {
  const contextUpdate = useContextUpdate(c)
  useIsoLayoutEffect(() => {
    if (isReactExperimental) {
      r.current = (f) => {
        contextUpdate(() => {
          runWithPriority(UserBlockingPriority, f)
        })
      }
    } else {
      r.current = (f) => {
        f()
      }
    }
  }, [contextUpdate])
  return children as ReactElement
}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const contextUpdateRef = useRef<ContextUpdate>()

  const pendingStateMap = useWeakMapRef<PendingStateMap>()

  const atomStateCache = useWeakMapRef<AtomStateCache>()

  const dependentsMap = useWeakMapRef<DependentsMap>()

  const [state, setStateOrig] = useState(() => {
    let initialState: State = mCreate()
    if (initialValues) {
      for (const [atom, value] of initialValues) {
        initialState = mSet(initialState, atom, {
          value,
          rev: 0,
          deps: new Map(),
        })
      }
    }
    return initialState
  })
  const lastStateRef = useRef<State>(state)
  const isLastStateValidRef = useRef(false)
  const setState = useCallback(
    (setStateAction: SetStateAction<State>) => {
      const pendingState = pendingStateMap.get(lastStateRef.current)
      if (pendingState) {
        if (
          typeof setStateAction !== 'function' &&
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.warn(
            '[Bug] pendingState can only be applied with function update'
          )
        }
        setStateOrig(pendingState)
      }
      isLastStateValidRef.current = false
      setStateOrig(setStateAction)
    },
    [pendingStateMap]
  )

  useIsoLayoutEffect(() => {
    const pendingState = pendingStateMap.get(state)
    if (pendingState) {
      pendingStateMap.delete(state)
      setState(pendingState)
      return
    }
    updateDependentsMap(lastStateRef.current, state, dependentsMap)
    lastStateRef.current = state
    isLastStateValidRef.current = true
  })

  const writeThunkQueueRef = useRef<WriteThunk[]>([])
  useEffect(() => {
    runWriteThunk(
      lastStateRef,
      isLastStateValidRef,
      pendingStateMap,
      setState,
      contextUpdateRef.current as ContextUpdate,
      writeThunkQueueRef.current
    )
  }, [state, setState, pendingStateMap])

  const actions = useMemo(
    () => ({
      add: <Value>(id: symbol, atom: Atom<Value>) => {
        addAtom(id, atom, dependentsMap)
      },
      del: <Value>(id: symbol, atom: Atom<Value>) => {
        delAtom(
          id,
          atom,
          dependentsMap,
          atomStateCache,
          (thunk: WriteThunk) => {
            writeThunkQueueRef.current.push(thunk)
          }
        )
      },
      read: <Value>(state: State, atom: Atom<Value>) =>
        readAtom(state, atom, setState, pendingStateMap, atomStateCache),
      write: <Value, Update>(
        atom: WritableAtom<Value, Update>,
        update: Update
      ) =>
        writeAtom(
          atom,
          update,
          setState,
          dependentsMap,
          atomStateCache,
          (thunk: WriteThunk) => {
            writeThunkQueueRef.current.push(thunk)
            if (isLastStateValidRef.current) {
              runWriteThunk(
                lastStateRef,
                isLastStateValidRef,
                pendingStateMap,
                setState,
                contextUpdateRef.current as ContextUpdate,
                writeThunkQueueRef.current
              )
            } else {
              // force update (FIXME this is a workaround for now)
              setState((prev) => mMerge(prev, mCreate()))
            }
          }
        ),
    }),
    [pendingStateMap, dependentsMap, atomStateCache, setState]
  )
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(state)
  }
  const [ActionsContext, StateContext] = getContexts(scope)
  return createElement(
    ActionsContext.Provider,
    { value: actions },
    createElement(
      StateContext.Provider,
      { value: state },
      createElement(
        InnerProvider,
        { r: contextUpdateRef, c: StateContext },
        children
      )
    )
  )
}

const atomToPrintable = (atom: AnyAtom) =>
  `${atom.key}:${atom.debugLabel ?? '<no debugLabel>'}`

const stateToPrintable = (state: State) =>
  mToPrintable(
    state,
    atomToPrintable,
    (v) => v.readE || v.readP || v.writeP || v.value
  )

const useDebugState = (state: State) => {
  useDebugValue(state, stateToPrintable)
}

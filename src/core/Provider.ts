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
import { createContext, useContextUpdate } from 'use-context-selector'

import {
  Atom,
  WritableAtom,
  AnyAtom,
  AnyWritableAtom,
  Getter,
  Setter,
} from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import {
  ImmutableMap,
  mCreate,
  mGet,
  mSet,
  mDel,
  mMerge,
  mToPrintable,
  mForEach,
} from './immutableMap'

// guessing if it's react experimental channel
const isReactExperimental =
  !!process.env.IS_REACT_EXPERIMENTAL ||
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

export type AtomState<Value = unknown> = {
  readE?: Error // read error
  readP?: Promise<void> // read promise
  writeP?: Promise<void> // write promise
  value?: Value
  deps: Set<AnyAtom> // read dependents
}

type State = ImmutableMap<AnyAtom, AtomState>
const initialState: State = mCreate()

type UsedState = ImmutableMap<AnyAtom, Set<symbol>> // symbol is id from useAtom
const initialUsedState: UsedState = mCreate()

// we store last atom state before deleting from provider state
// and reuse it as long as it's not gc'd
type AtomStateCache = WeakMap<AnyAtom, AtomState>

// pending state for adding a new atom and write batching
type PendingStateMap = WeakMap<State, State> // the value is next state

type ContextUpdate = (t: () => void) => void

type WriteThunk = (lastState: State) => State // returns next state

export type Actions = {
  add: <Value>(id: symbol, atom: Atom<Value>) => void
  del: <Value>(id: symbol, atom: Atom<Value>) => void
  read: <Value>(state: State, atom: Atom<Value>) => AtomState<Value>
  write: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void | Promise<void>
}

const updateAtomState = <Value>(
  atom: Atom<Value>,
  prevState: State,
  partial: Partial<AtomState<Value>>,
  prevPromise?: Promise<void>,
  isNew?: boolean
) => {
  let atomState = mGet(prevState, atom) as AtomState<Value> | undefined
  if (!atomState) {
    if (!isNew && process.env.NODE_ENV !== 'production') {
      warnAtomStateNotFound('updateAtomState', atom)
    }
    atomState = { deps: new Set() }
  }
  if (prevPromise && prevPromise !== atomState.readP) {
    return prevState
  }
  return mSet(prevState, atom, { ...atomState, ...partial })
}

const addDependent = (atom: AnyAtom, dependent: AnyAtom, prevState: State) => {
  const atomState = mGet(prevState, atom)
  if (atomState) {
    if (!atomState.deps.has(dependent)) {
      const newDeps = new Set(atomState.deps).add(dependent)
      return mSet(prevState, atom, { ...atomState, deps: newDeps })
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warnAtomStateNotFound('addDependent', atom)
  }
  return prevState
}

const replaceDependencies = (
  atom: AnyAtom,
  prevState: State,
  dependenciesToReplace: Set<AnyAtom>
) => {
  const dependencies = new Set(dependenciesToReplace)
  let nextState = prevState
  mForEach(nextState, (a) => {
    const aState = mGet(nextState, a) as AtomState<unknown>
    if (aState.deps.has(atom)) {
      if (dependencies.has(a)) {
        // not changed
        dependencies.delete(a)
      } else {
        const newDeps = new Set(aState.deps)
        newDeps.delete(atom)
        nextState = mSet(nextState, a, { ...aState, deps: newDeps })
      }
    }
  })
  dependencies.forEach((a) => {
    const aState = mGet(nextState, a)
    if (aState) {
      const newDeps = new Set(aState.deps).add(atom)
      nextState = mSet(nextState, a, { ...aState, deps: newDeps })
    } else if (process.env.NODE_ENV !== 'production') {
      warnAtomStateNotFound('replaceDependencies', a)
    }
  })
  return nextState
}

const readAtomState = <Value>(
  atom: Atom<Value>,
  prevState: State,
  setState: Dispatch<(prev: State) => State>,
  atomStateCache: AtomStateCache,
  force?: boolean
) => {
  if (!force) {
    let atomState = mGet(prevState, atom) as AtomState<Value> | undefined
    if (atomState) {
      return [atomState, prevState] as const
    }
    atomState = atomStateCache.get(atom) as AtomState<Value> | undefined
    if (atomState) {
      return [atomState, mSet(prevState, atom, atomState)] as const
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
      } else {
        setState((prev) => addDependent(a, atom, prev))
      }
      if (a !== atom) {
        const [aState, nextNextState] = readAtomState(
          a,
          nextState,
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
      const aState = mGet(nextState, a)
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
              atom,
              replaceDependencies(atom, prev, dependenciesToReplace),
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
              atom,
              replaceDependencies(atom, prev, dependenciesToReplace),
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
            readAtomState(atom, mDel(prev, atom), setState, atomStateCache)[1]
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
    atom,
    nextState,
    {
      readE: error,
      readP: promise,
      value: promise ? atom.init : value,
    },
    undefined,
    true
  )
  if (flushDependencies) {
    nextState = replaceDependencies(atom, nextState, dependencies)
    dependencies = null
  }
  const atomState = mGet(nextState, atom) as AtomState<Value>
  isSync = false
  return [atomState, nextState] as const
}

const updateDependentsState = <Value>(
  atom: Atom<Value>,
  prevState: State,
  setState: Dispatch<(prev: State) => State>,
  atomStateCache: AtomStateCache
) => {
  const atomState = mGet(prevState, atom)
  if (!atomState) {
    if (process.env.NODE_ENV !== 'production') {
      warnAtomStateNotFound('updateDependentsState', atom)
    }
    return prevState
  }
  let nextState = prevState
  atomState.deps.forEach((dependent) => {
    if (
      dependent === atom ||
      typeof dependent === 'symbol' ||
      !mGet(nextState, dependent)
    ) {
      return
    }
    const [dependentState, nextNextState] = readAtomState(
      dependent,
      nextState,
      setState,
      atomStateCache,
      true
    )
    const promise = dependentState.readP
    if (promise) {
      promise.then(() => {
        setState((prev) =>
          updateDependentsState(dependent, prev, setState, atomStateCache)
        )
      })
      nextState = nextNextState
    } else {
      nextState = updateDependentsState(
        dependent,
        nextNextState,
        setState,
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
    readingAtom,
    prevState,
    setState,
    atomStateCache
  )
  if (nextState !== prevState) {
    pendingStateMap.set(state, nextState)
  }
  return atomState
}

const writeAtom = <Value, Update>(
  writingAtom: WritableAtom<Value, Update>,
  update: Update,
  setState: Dispatch<(prev: State) => State>,
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
          const aState = mGet(nextState, a)
          if (!aState) {
            if (process.env.NODE_ENV !== 'production') {
              warnAtomStateNotFound('writeAtomState', a)
            }
            return a.init
          }
          if (aState.readP && process.env.NODE_ENV !== 'production') {
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
                a,
                updateAtomState(a, nextState, partialAtomState),
                setState,
                atomStateCache
              )
            } else {
              setState((prev) =>
                updateDependentsState(
                  a,
                  updateAtomState(a, prev, partialAtomState),
                  setState,
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
        nextState = updateAtomState(atom, nextState, {
          writeP: promiseOrVoid.then(() => {
            addWriteThunk((prev) =>
              updateAtomState(atom, prev, { writeP: undefined })
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

export const ActionsContext = createContext<Actions | null>(null)
export const StateContext = createContext<State | null>(null)

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
}> = ({ r, children }) => {
  const contextUpdate = useContextUpdate(StateContext)
  if (!r.current) {
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
  }
  return children as ReactElement
}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
}> = ({ initialValues, children }) => {
  const contextUpdateRef = useRef<ContextUpdate>()

  const pendingStateMap = useWeakMapRef<PendingStateMap>()

  const atomStateCache = useWeakMapRef<AtomStateCache>()

  const [state, setStateOrig] = useState(() => {
    let s = initialState
    if (initialValues) {
      for (const [atom, value] of initialValues) {
        s = mSet(s, atom, { value, deps: new Set() })
      }
    }
    return s
  })
  const lastStateRef = useRef<State>(state)
  const isLastStateValidRef = useRef(false)
  const setState = useCallback(
    (setStateAction: SetStateAction<State>) => {
      const pendingState = pendingStateMap.get(lastStateRef.current)
      if (pendingState) {
        if (
          typeof setStateAction !== 'function' &&
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
    lastStateRef.current = state
    isLastStateValidRef.current = true
  })

  const [used, setUsed] = useState(initialUsedState)
  useEffect(() => {
    if (!isLastStateValidRef.current) return
    const lastState = lastStateRef.current
    let nextState = lastState
    let deleted: boolean
    do {
      deleted = false
      mForEach(nextState, (a) => {
        const aState = mGet(nextState, a) as AtomState<unknown>
        // do not delete while promises are not resolved
        if (aState.writeP || aState.readP) return
        const depsSize = aState.deps.size
        const isEmpty =
          (depsSize === 0 || (depsSize === 1 && aState.deps.has(a))) &&
          !mGet(used, a)?.size
        if (isEmpty) {
          atomStateCache.set(a, aState)
          nextState = mDel(nextState, a)
          deleted = true
        }
      })
    } while (deleted)
    if (nextState !== lastState) {
      setState(nextState)
    }
  }, [used, atomStateCache, setState])

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
        setUsed((prev) => mSet(prev, atom, new Set(mGet(prev, atom)).add(id)))
      },
      del: <Value>(id: symbol, atom: Atom<Value>) => {
        setUsed((prev) => {
          const oldSet = mGet(prev, atom)
          if (!oldSet) return prev
          const newSet = new Set(oldSet)
          newSet.delete(id)
          if (newSet.size) {
            return mSet(prev, atom, newSet)
          }
          return mDel(prev, atom)
        })
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
    [pendingStateMap, atomStateCache, setState]
  )
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(state)
  }
  return createElement(
    ActionsContext.Provider,
    { value: actions },
    createElement(
      StateContext.Provider,
      { value: state },
      createElement(InnerProvider, { r: contextUpdateRef }, children)
    )
  )
}

const atomToPrintable = (atom: AnyAtom) =>
  `${atom.key}:${atom.debugLabel ?? '<no debugLabel>'}`

const stateToPrintable = (state: State) =>
  mToPrintable(state, atomToPrintable, (v) => ({
    value: v.readE || v.readP || v.writeP || v.value,
    deps: Array.from(v.deps).map(atomToPrintable),
  }))

const useDebugState = (state: State) => {
  useDebugValue(state, stateToPrintable)
}

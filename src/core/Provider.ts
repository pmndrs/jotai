import React, {
  Dispatch,
  SetStateAction,
  MutableRefObject,
  ReactElement,
  createElement,
  useMemo,
  useState,
  useRef,
  useEffect,
  useDebugValue,
} from 'react'
import {
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
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
  mKeys,
  mMerge,
  mToPrintable,
} from './immutableMap'

const warningObject = new Proxy(
  {},
  {
    get() {
      throw new Error('Please use <Provider>')
    },
    apply() {
      throw new Error('Please use <Provider>')
    },
  }
)

// dependents for read operation
type DependentsMap = Map<AnyAtom, Set<AnyAtom | symbol>> // symbol is id from useAtom

const addDependent = (
  dependentsMap: DependentsMap,
  atom: AnyAtom,
  dependent: AnyAtom | symbol
) => {
  let dependents = dependentsMap.get(atom)
  if (!dependents) {
    dependents = new Set<AnyAtom | symbol>()
    dependentsMap.set(atom, dependents)
  }
  dependents.add(dependent)
}

const deleteDependent = (
  dependentsMap: DependentsMap,
  dependent: AnyAtom | symbol
) => {
  dependentsMap.forEach((dependents) => {
    dependents.delete(dependent)
  })
}

const setDependencies = (
  dependentsMap: DependentsMap,
  atom: AnyAtom,
  dependencies: Set<AnyAtom>
) => {
  deleteDependent(dependentsMap, atom)
  dependencies.forEach((dependency) => {
    addDependent(dependentsMap, dependency, atom)
  })
}

const listDependents = (
  dependentsMap: DependentsMap,
  atom: AnyAtom,
  excludeSelf: boolean
) => {
  const dependents = new Set(dependentsMap.get(atom))
  if (excludeSelf) {
    dependents.delete(atom)
  }
  return dependents
}

export type AtomState<Value = unknown> = {
  readE?: Error // read error
  readP?: Promise<void> // read promise
  writeP?: Promise<void> // write promise
  value?: Value
}

type State = ImmutableMap<AnyAtom, AtomState>

// pending state for adding a new atom
type ReadPendingMap = WeakMap<State, State> // the value is next state

type ContextUpdate = (t: () => void) => void

type WriteThunk = (lastState: State) => State // returns next state

export type Actions = {
  add: <Value>(id: symbol, atom: Atom<Value>) => void
  del: (id: symbol) => void
  read: <Value>(state: State, atom: Atom<Value>) => AtomState<Value>
  write: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void | Promise<void>
}

const initialState: State = mCreate()

const getAtomStateValue = (atom: AnyAtom, state: State) => {
  const atomState = mGet(state, atom)
  if (!atomState) {
    throw new Error('atom state not found. possibly a bug.')
  }
  return atomState.value
}

const readAtomState = <Value>(
  atom: Atom<Value>,
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  const atomState = mGet(prevState, atom) as AtomState<Value> | undefined
  if (atomState) {
    return [atomState, prevState] as const
  }
  let nextState = prevState
  let error: Error | undefined = undefined
  let promise: Promise<void> | undefined = undefined
  let value: Value | undefined = undefined
  let dependencies: Set<AnyAtom> | null = new Set()
  let isSync = true
  try {
    const promiseOrValue = atom.read(((a: AnyAtom) => {
      if (dependencies) {
        dependencies.add(a)
      } else {
        addDependent(dependentsMap, a, atom)
      }
      if (a !== atom) {
        const [aState, nextNextState] = readAtomState(
          a,
          nextState,
          setState,
          dependentsMap
        )
        if (isSync) {
          nextState = nextNextState
        } else {
          // XXX is this really valid?
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
          setDependencies(dependentsMap, atom, dependencies as Set<AnyAtom>)
          dependencies = null
          setState((prev) => mSet(prev, atom, { value }))
        })
        .catch((e) => {
          setState((prev) =>
            mSet(prev, atom, {
              value: getAtomStateValue(atom, prev),
              readE: e instanceof Error ? e : new Error(e),
            })
          )
        })
    } else {
      setDependencies(dependentsMap, atom, dependencies)
      dependencies = null
      value = promiseOrValue
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
  const nextAtomState: AtomState<Value> = {
    readE: error,
    readP: promise,
    value: promise ? atom.init : value,
  }
  nextState = mSet(nextState, atom, nextAtomState)
  isSync = false
  return [nextAtomState, nextState] as const
}

const updateDependentsState = <Value>(
  atom: Atom<Value>,
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  let nextState = prevState
  listDependents(dependentsMap, atom, true).forEach((dependent) => {
    if (typeof dependent === 'symbol') return
    let dependencies: Set<AnyAtom> | null = new Set()
    try {
      const promiseOrValue = dependent.read(((a: AnyAtom) => {
        if (dependencies) {
          dependencies.add(a)
        } else {
          addDependent(dependentsMap, a, dependent)
        }
        const [aState, nextNextState] = readAtomState(
          a,
          nextState,
          setState,
          dependentsMap
        )
        // FIXME not sync??
        nextState = nextNextState
        if (aState.readE) {
          throw aState.readE
        }
        return aState.value
      }) as Getter)
      if (promiseOrValue instanceof Promise) {
        const promise = promiseOrValue
          .then((value) => {
            setDependencies(
              dependentsMap,
              dependent,
              dependencies as Set<AnyAtom>
            )
            dependencies = null
            const nextAtomState: AtomState = { value }
            setState((prev) => {
              const prevPromise = mGet(prev, dependent)?.readP
              if (prevPromise && prevPromise !== promise) {
                // There is a new promise, so we skip updating this one.
                return prev
              }
              const nextState = mSet(prev, dependent, nextAtomState)
              const nextPartialState = updateDependentsState(
                dependent,
                nextState,
                setState,
                dependentsMap
              )
              return mMerge(nextState, nextPartialState)
            })
          })
          .catch((e) => {
            setState((prev) =>
              mSet(prev, dependent, {
                value: getAtomStateValue(dependent, prev),
                readE: e instanceof Error ? e : new Error(e),
              })
            )
          })
        nextState = mSet(nextState, dependent, {
          value: getAtomStateValue(dependent, prevState),
          readP: promise,
        })
      } else {
        setDependencies(dependentsMap, dependent, dependencies)
        dependencies = null
        nextState = mSet(nextState, dependent, {
          value: promiseOrValue,
        })
        nextState = updateDependentsState(
          dependent,
          mMerge(prevState, nextState),
          setState,
          dependentsMap
        )
      }
    } catch (e) {
      nextState = mSet(nextState, dependent, {
        value: getAtomStateValue(dependent, prevState),
        readE: e instanceof Error ? e : new Error(e),
      })
      nextState = updateDependentsState(
        dependent,
        mMerge(prevState, nextState),
        setState,
        dependentsMap
      )
    }
  })
  return nextState
}

const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
  readPendingMap: ReadPendingMap
) => {
  let prevState = readPendingMap.get(state) || state
  const [atomState, nextState] = readAtomState(
    readingAtom,
    prevState,
    setState,
    dependentsMap
  )
  if (nextState !== prevState) {
    readPendingMap.set(state, nextState)
  }
  return atomState
}

const addAtom = <Value>(
  id: symbol,
  atom: Atom<Value>,
  dependentsMap: DependentsMap
) => {
  addDependent(dependentsMap, atom, id)
}

const delAtom = (
  id: symbol,
  setGcCount: Dispatch<SetStateAction<number>>,
  dependentsMap: DependentsMap
) => {
  deleteDependent(dependentsMap, id)
  setGcCount((c) => c + 1) // trigger re-render for gc
}

const gcAtom = (
  state: State,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  let nextState = state
  let deleted: boolean
  do {
    deleted = false
    mKeys(nextState).forEach((atom) => {
      const isEmpty = dependentsMap.get(atom)?.size === 0
      if (isEmpty) {
        nextState = mDel(nextState, atom)
        dependentsMap.delete(atom)
        deleted = true
      }
    })
  } while (deleted)
  if (nextState !== state) {
    setState(nextState)
  }
}

const writeAtom = <Value, Update>(
  writingAtom: WritableAtom<Value, Update>,
  update: Update,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
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
          if (process.env.NODE_ENV !== 'production') {
            const s = mGet(prevState, a)
            if (s && s.readP) {
              // TODO
              console.log(
                'Reading pending atom state in write operation. Not sure how to deal with it. Returning stale vaule for',
                a
              )
            }
          }
          return getAtomStateValue(a, nextState)
        }) as Getter,
        ((a: AnyWritableAtom, v: unknown) => {
          if (a === atom) {
            const nextAtomState: AtomState = { value: v }
            if (isSync) {
              nextState = mSet(nextState, a, nextAtomState)
              nextState = updateDependentsState(
                a,
                mMerge(prevState, nextState),
                setState,
                dependentsMap
              )
            } else {
              setState((prev) =>
                updateDependentsState(
                  a,
                  mSet(prev, a, nextAtomState),
                  setState,
                  dependentsMap
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
        const nextAtomState: AtomState = {
          ...mGet(nextState, atom),
          writeP: promiseOrVoid.then(() => {
            addWriteThunk((prev) =>
              mSet(prev, atom, {
                ...mGet(prev, atom),
                writeP: undefined,
              })
            )
          }),
        }
        nextState = mSet(nextState, atom, nextAtomState)
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

  addWriteThunk((prevState) => writeAtomState(prevState, writingAtom, update))

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
  lastStateRef: MutableRefObject<State | null>,
  pendingStateRef: MutableRefObject<State | null>,
  setState: Dispatch<SetStateAction<State>>,
  contextUpdate: ContextUpdate,
  writeThunkQueue: WriteThunk[]
) => {
  while (true) {
    if (!lastStateRef.current) {
      return
    }
    if (writeThunkQueue.length === 0) {
      return
    }
    const thunk = writeThunkQueue.shift() as WriteThunk
    const prevState = pendingStateRef.current || lastStateRef.current
    const nextState = thunk(prevState)
    if (nextState !== prevState) {
      pendingStateRef.current = nextState
      runWithPriority(NormalPriority, () => {
        const pendingState = pendingStateRef.current
        if (pendingState) {
          pendingStateRef.current = null
          contextUpdate(() => {
            runWithPriority(UserBlockingPriority, () => {
              setState(pendingState)
            })
          })
        }
      })
    }
  }
}

export const ActionsContext = createContext(warningObject as Actions)
export const StateContext = createContext(warningObject as State)

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
}> = ({ r, children }) => {
  const contextUpdate = useContextUpdate(StateContext)
  if (!r.current) {
    r.current = contextUpdate
  }
  return children as ReactElement
}

export const Provider: React.FC = ({ children }) => {
  const contextUpdateRef = useRef<ContextUpdate>()

  const dependentsMapRef = useRef<DependentsMap>()
  if (!dependentsMapRef.current) {
    dependentsMapRef.current = new Map()
  }

  const readPendingMapRef = useRef<ReadPendingMap>()
  if (!readPendingMapRef.current) {
    readPendingMapRef.current = new WeakMap()
  }

  const [state, setStateOrig] = useState(initialState)
  const lastStateRef = useRef<State | null>(null)
  const pendingStateRef = useRef<State | null>(null)
  const setState = (setStateAction: SetStateAction<State>) => {
    lastStateRef.current = null
    const pendingState = pendingStateRef.current
    if (pendingState) {
      pendingStateRef.current = null
      setStateOrig(pendingState)
    }
    setStateOrig(setStateAction)
  }

  useIsoLayoutEffect(() => {
    const readPendingMap = readPendingMapRef.current as ReadPendingMap
    const pendingState = readPendingMap.get(state)
    if (pendingState) {
      setState(pendingState)
      return
    }
    lastStateRef.current = state
  })

  const [gcCount, setGcCount] = useState(0) // to trigger gc
  useEffect(() => {
    gcAtom(state, setState, dependentsMapRef.current as DependentsMap)
  }, [state, gcCount])

  const writeThunkQueueRef = useRef<WriteThunk[]>([])
  useEffect(() => {
    runWriteThunk(
      lastStateRef,
      pendingStateRef,
      setState,
      contextUpdateRef.current as ContextUpdate,
      writeThunkQueueRef.current
    )
  }, [state])

  const actions = useMemo(
    () => ({
      add: <Value>(id: symbol, atom: Atom<Value>) =>
        addAtom(id, atom, dependentsMapRef.current as DependentsMap),
      del: (id: symbol) =>
        delAtom(id, setGcCount, dependentsMapRef.current as DependentsMap),
      read: <Value>(state: State, atom: Atom<Value>) =>
        readAtom(
          state,
          atom,
          setState,
          dependentsMapRef.current as DependentsMap,
          readPendingMapRef.current as ReadPendingMap
        ),
      write: <Value, Update>(
        atom: WritableAtom<Value, Update>,
        update: Update
      ) =>
        writeAtom(
          atom,
          update,
          setState,
          dependentsMapRef.current as DependentsMap,
          (thunk: WriteThunk) => {
            writeThunkQueueRef.current.push(thunk)
            runWriteThunk(
              lastStateRef,
              pendingStateRef,
              setState,
              contextUpdateRef.current as ContextUpdate,
              writeThunkQueueRef.current
            )
          }
        ),
    }),
    []
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

const useDebugState = (state: State) => {
  useDebugValue(state, (s: State) =>
    mToPrintable(
      s,
      (k) => `${k.key}:${k.debugLabel ?? '<no debugLabel>'}`,
      (v) => v.readE || v.readP || v.writeP || v.value
    )
  )
}

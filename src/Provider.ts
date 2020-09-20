import React, {
  Dispatch,
  SetStateAction,
  MutableRefObject,
  createElement,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
import { createContext } from 'use-context-selector'

import {
  Atom,
  WritableAtom,
  AnyAtom,
  AnyWritableAtom,
  Getter,
  Setter,
} from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

// mutate map with additonal map
const appendMap = <K, V>(dst: Map<K, V>, src: Map<K, V>) => {
  src.forEach((v, k) => {
    dst.set(k, v)
  })
  return dst
}

// create new map from two maps
const concatMap = <K, V>(src1: Map<K, V>, src2: Map<K, V>) =>
  appendMap(new Map<K, V>(src1), src2)

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
  error?: Error
  promise?: Promise<void>
  value: Value
}

type State = Map<AnyAtom, AtomState>

export type PartialState = State
type WriteThunk = (lastState: State) => State // returns next state

export type Actions = {
  add: <Value>(
    id: symbol,
    atom: Atom<Value>,
    partialState?: PartialState
  ) => void
  del: (id: symbol) => void
  read: <Value>(
    state: State,
    atom: Atom<Value>
  ) => readonly [AtomState, PartialState]
  write: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void | Promise<void>
}

const initialState: State = new Map()

const getAtomStateValue = (state: State, atom: AnyAtom) => {
  const atomState = state.get(atom)
  return atomState ? atomState.value : atom.init
}

const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  const readAtomValue = <V>(prevState: State, atom: Atom<V>) => {
    const partialState: PartialState = new Map()
    const atomState = prevState.get(atom) as AtomState<V> | undefined
    if (atomState) {
      return [atomState, partialState] as const
    }
    let error: Error | undefined = undefined
    let promise: Promise<void> | undefined = undefined
    let value: V | null = null
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
          const [nextAtomState, nextPartialState] = readAtomValue(prevState, a)
          if (isSync) {
            appendMap(partialState, nextPartialState)
          } else {
            setState((prev) => concatMap(prev, nextPartialState))
          }
          if (nextAtomState.error) {
            throw nextAtomState.error
          }
          if (nextAtomState.promise) {
            throw nextAtomState.promise
          }
          return nextAtomState.value
        }
        // a === atom
        const aState = prevState.get(a)
        if (aState) {
          if (aState.promise) {
            throw aState.promise
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
            setState((prev) => new Map(prev).set(atom, { value }))
          })
          .catch((e) => {
            setState((prev) =>
              new Map(prev).set(atom, {
                value: getAtomStateValue(prev, atom),
                error: e instanceof Error ? e : new Error(e),
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
    const nextAtomState: AtomState = {
      error,
      promise,
      value: promise ? atom.init : value,
    }
    partialState.set(atom, nextAtomState)
    isSync = false
    return [nextAtomState, partialState] as const
  }

  return readAtomValue(state, readingAtom)
}

const addAtom = <Value>(
  id: symbol,
  atom: Atom<Value>,
  partialState: PartialState | undefined,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  addDependent(dependentsMap, atom, id)
  if (partialState) {
    setState((prev) => concatMap(prev, partialState))
  }
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
  const gcAtomState = (prevState: State) => {
    const nextState = new Map(prevState)
    while (true) {
      let deleted = false
      nextState.forEach((_atomState, atom) => {
        const isEmpty = dependentsMap.get(atom)?.size === 0
        if (isEmpty) {
          nextState.delete(atom)
          dependentsMap.delete(atom)
          deleted = true
        }
      })
      if (!deleted) {
        break
      }
    }
    return nextState
  }

  const nextState = gcAtomState(state)
  if (state.size !== nextState.size) {
    setState(nextState)
  }
}

const writeAtom = <Value, Update>(
  updatingAtom: WritableAtom<Value, Update>,
  update: Update,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
  addWriteThunk: (thunk: WriteThunk) => void
) => {
  const pendingPromises: Promise<void>[] = []

  const updateDependentsState = (prevState: State, atom: AnyAtom) => {
    const partialState: PartialState = new Map()
    listDependents(dependentsMap, atom, true).forEach((dependent) => {
      if (typeof dependent === 'symbol') return
      let dependencies: Set<AnyAtom> | null = new Set()
      try {
        const v = dependent.read(((a: AnyAtom) => {
          if (dependencies) {
            dependencies.add(a)
          } else {
            addDependent(dependentsMap, a, dependent)
          }
          const s = prevState.get(a)
          if (!s) {
            throw new Error('atom state not found. possibly a bug.')
          }
          if (s.error) {
            throw s.error
          }
          return s.value
        }) as Getter)
        if (v instanceof Promise) {
          const promise = v
            .then((vv) => {
              setDependencies(
                dependentsMap,
                dependent,
                dependencies as Set<AnyAtom>
              )
              dependencies = null
              const nextAtomState: AtomState = { value: vv }
              setState((prev) => {
                const nextState = new Map(prev).set(dependent, nextAtomState)
                const nextPartialState = updateDependentsState(
                  nextState,
                  dependent
                )
                return appendMap(nextState, nextPartialState)
              })
            })
            .catch((e) => {
              setState((prev) =>
                new Map(prev).set(dependent, {
                  value: getAtomStateValue(prev, dependent),
                  error: e instanceof Error ? e : new Error(e),
                })
              )
            })
          partialState.set(dependent, {
            value: getAtomStateValue(prevState, dependent),
            promise,
          })
        } else {
          setDependencies(dependentsMap, dependent, dependencies)
          dependencies = null
          partialState.set(dependent, { value: v })
          appendMap(
            partialState,
            updateDependentsState(concatMap(prevState, partialState), dependent)
          )
        }
      } catch (e) {
        partialState.set(dependent, {
          value: getAtomStateValue(prevState, dependent),
          error: e instanceof Error ? e : new Error(e),
        })
        appendMap(
          partialState,
          updateDependentsState(concatMap(prevState, partialState), dependent)
        )
      }
    })
    return partialState
  }

  const updateAtomState = <Value, Update>(
    prevState: State,
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => {
    const partialState: PartialState = new Map()
    let isSync = true
    try {
      const promise = atom.write(
        ((a: AnyAtom) => {
          if (process.env.NODE_ENV !== 'production') {
            const s = prevState.get(a)
            if (s && s.promise) {
              console.log(
                'Reading pending atom state in write operation. Not sure how to deal with it. Returning obsolete vaule for',
                a
              )
            }
          }
          return getAtomStateValue(concatMap(prevState, partialState), a)
        }) as Getter,
        ((a: AnyWritableAtom, v: unknown) => {
          if (a === atom) {
            const nextAtomState: AtomState = { value: v }
            if (isSync) {
              partialState.set(a, nextAtomState)
              appendMap(
                partialState,
                updateDependentsState(concatMap(prevState, partialState), a)
              )
            } else {
              setState((prev) => {
                const nextState = new Map(prev).set(a, nextAtomState)
                const nextPartialState = updateDependentsState(nextState, a)
                return appendMap(nextState, nextPartialState)
              })
            }
          } else {
            if (isSync) {
              const nextPartialState = updateAtomState(prevState, a, v)
              appendMap(partialState, nextPartialState)
            } else {
              addWriteThunk((prev) => {
                const nextPartialState = updateAtomState(prev, a, v)
                return concatMap(prev, nextPartialState)
              })
            }
          }
        }) as Setter,
        update
      )
      if (promise instanceof Promise) {
        pendingPromises.push(promise)
        // XXX this is write pending (can be confused with read pending)
        const nextAtomState: AtomState = {
          value: getAtomStateValue(concatMap(prevState, partialState), atom),
          promise: promise.then(() => {
            addWriteThunk((prev) =>
              new Map(prev).set(atom, {
                value: getAtomStateValue(prev, atom),
              })
            )
          }),
        }
        partialState.set(atom, nextAtomState)
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
    return partialState
  }

  addWriteThunk((prevState) => {
    const nextPartialState = updateAtomState(prevState, updatingAtom, update)
    return concatMap(prevState, nextPartialState)
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

const runWriteThunk = (
  lastStateRef: MutableRefObject<State | null>,
  setState: Dispatch<SetStateAction<State>>,
  writeThunkQueue: WriteThunk[]
) => {
  while (true) {
    if (lastStateRef.current === null) {
      return
    }
    if (writeThunkQueue.length === 0) {
      return
    }
    const thunk = writeThunkQueue.shift() as WriteThunk
    const lastState = lastStateRef.current
    const nextState = thunk(lastState)
    if (nextState !== lastState) {
      setState(nextState)
      return
    }
  }
}

export const ActionsContext = createContext(warningObject as Actions)
export const StateContext = createContext(warningObject as State)

export const Provider: React.FC = ({ children }) => {
  const [state, setStateOrig] = useState(initialState)
  const setState = (setStateAction: SetStateAction<State>) => {
    lastStateRef.current = null
    setStateOrig(setStateAction)
  }

  const dependentsMapRef = useRef<DependentsMap>()
  if (!dependentsMapRef.current) {
    dependentsMapRef.current = new Map()
  }

  const [gcCount, setGcCount] = useState(0) // to trigger gc
  useEffect(() => {
    gcAtom(state, setState, dependentsMapRef.current as DependentsMap)
  }, [state, gcCount])

  const lastStateRef = useRef<State | null>(null)
  useIsoLayoutEffect(() => {
    lastStateRef.current = state
  })

  const writeThunkQueueRef = useRef<WriteThunk[]>([])
  useEffect(() => {
    runWriteThunk(lastStateRef, setState, writeThunkQueueRef.current)
  }, [state])

  const actions = useMemo(
    () => ({
      add: <Value>(
        id: symbol,
        atom: Atom<Value>,
        partialState?: PartialState
      ) =>
        addAtom(
          id,
          atom,
          partialState,
          setState,
          dependentsMapRef.current as DependentsMap
        ),
      del: (id: symbol) =>
        delAtom(id, setGcCount, dependentsMapRef.current as DependentsMap),
      read: <Value>(state: State, atom: Atom<Value>) =>
        readAtom(
          state,
          atom,
          setState,
          dependentsMapRef.current as DependentsMap
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
            runWriteThunk(lastStateRef, setState, writeThunkQueueRef.current)
          }
        ),
    }),
    []
  )
  return createElement(
    ActionsContext.Provider,
    { value: actions },
    createElement(StateContext.Provider, { value: state }, children)
  )
}

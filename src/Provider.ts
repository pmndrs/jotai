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
  readE?: Error // read error
  readP?: Promise<void> // read promise
  writeP?: Promise<void> // write promise
  value: Value
}

type State = Map<AnyAtom, AtomState>
type PartialState = State

// pending partial state for adding a new atom
type ReadPendingMap = WeakMap<AnyAtom, PartialState>

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

const initialState: State = new Map()

const getAtomState = (atom: AnyAtom, state: State, tmpState?: PartialState) => {
  const atomState = (tmpState && tmpState.get(atom)) || state.get(atom)
  if (!atomState) {
    throw new Error('atom state not found. possibly a bug.')
  }
  return atomState
}

const getAtomStateValue = (
  atom: AnyAtom,
  state: State,
  tmpState?: PartialState
) => {
  const atomState = (tmpState && tmpState.get(atom)) || state.get(atom)
  return atomState ? atomState.value : atom.init
}

const readAtom = <Value>(
  state: State,
  readingAtom: Atom<Value>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
  readPendingMap: ReadPendingMap
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
          const [nextAtomState, nextPartialState] = readAtomValue(
            concatMap(prevState, partialState),
            a
          )
          if (isSync) {
            appendMap(partialState, nextPartialState)
          } else {
            setState((prev) => concatMap(prev, nextPartialState))
          }
          if (nextAtomState.readE) {
            throw nextAtomState.readE
          }
          if (nextAtomState.readP) {
            throw nextAtomState.readP
          }
          return nextAtomState.value
        }
        // a === atom
        const aState = partialState.get(a) || prevState.get(a)
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
            setState((prev) => new Map(prev).set(atom, { value }))
          })
          .catch((e) => {
            setState((prev) =>
              new Map(prev).set(atom, {
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
    const nextAtomState: AtomState = {
      readE: error,
      readP: promise,
      value: promise ? atom.init : value,
    }
    if (!promise) {
      partialState.set(atom, nextAtomState)
    }
    isSync = false
    return [nextAtomState, partialState] as const
  }

  const [atomState, partialState] = readAtomValue(state, readingAtom)
  const prevPartialState = readPendingMap.get(readingAtom)
  readPendingMap.set(
    readingAtom,
    prevPartialState ? concatMap(prevPartialState, partialState) : partialState
  )
  return atomState as AtomState<Value>
}

const addAtom = <Value>(
  id: symbol,
  atom: Atom<Value>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
  readPendingMap: ReadPendingMap
) => {
  addDependent(dependentsMap, atom, id)
  const partialState = readPendingMap.get(atom)
  if (partialState) {
    readPendingMap.delete(atom)
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
  const nextState = new Map(state)
  let deleted: boolean
  do {
    deleted = false
    nextState.forEach((_atomState, atom) => {
      const isEmpty = dependentsMap.get(atom)?.size === 0
      if (isEmpty) {
        nextState.delete(atom)
        dependentsMap.delete(atom)
        deleted = true
      }
    })
  } while (deleted)
  if (nextState.size !== state.size) {
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
        const promiseOrValue = dependent.read(((a: AnyAtom) => {
          if (dependencies) {
            dependencies.add(a)
          } else {
            addDependent(dependentsMap, a, dependent)
          }
          const s = getAtomState(a, prevState)
          if (s.readE) {
            throw s.readE
          }
          return s.value
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
                const prevPromise = prev.get(dependent)?.readP
                if (prevPromise && prevPromise !== promise) {
                  // There is a new promise, so we skip updating this one.
                  return prev
                }
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
                  value: getAtomStateValue(dependent, prev),
                  readE: e instanceof Error ? e : new Error(e),
                })
              )
            })
          partialState.set(dependent, {
            value: getAtomStateValue(dependent, prevState),
            readP: promise,
          })
        } else {
          setDependencies(dependentsMap, dependent, dependencies)
          dependencies = null
          partialState.set(dependent, { value: promiseOrValue })
          appendMap(
            partialState,
            updateDependentsState(concatMap(prevState, partialState), dependent)
          )
        }
      } catch (e) {
        partialState.set(dependent, {
          value: getAtomStateValue(dependent, prevState),
          readE: e instanceof Error ? e : new Error(e),
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
    const prevAtomState = prevState.get(atom)
    if (prevAtomState && prevAtomState.writeP) {
      const promise = prevAtomState.writeP.then(() => {
        addWriteThunk((prev) => {
          const nextPartialState = updateAtomState(prev, atom, update)
          if (nextPartialState) {
            return concatMap(prevState, nextPartialState)
          }
          return prev
        })
      })
      pendingPromises.push(promise)
      return null
    }
    const partialState: PartialState = new Map()
    let isSync = true
    try {
      const promiseOrVoid = atom.write(
        ((a: AnyAtom) => {
          if (process.env.NODE_ENV !== 'production') {
            const s = prevState.get(a)
            if (s && s.readP) {
              console.log(
                'Reading pending atom state in write operation. Not sure how to deal with it. Returning stale vaule for',
                a
              )
            }
          }
          return getAtomStateValue(a, prevState, partialState)
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
              const nextPartialState = updateAtomState(
                concatMap(prevState, partialState),
                a,
                v
              )
              if (nextPartialState) {
                appendMap(partialState, nextPartialState)
              }
            } else {
              addWriteThunk((prev) => {
                const nextPartialState = updateAtomState(prev, a, v)
                if (nextPartialState) {
                  return concatMap(prev, nextPartialState)
                }
                return prev
              })
            }
          }
        }) as Setter,
        update
      )
      if (promiseOrVoid instanceof Promise) {
        pendingPromises.push(promiseOrVoid)
        const nextAtomState: AtomState = {
          ...getAtomState(atom, prevState, partialState),
          writeP: promiseOrVoid.then(() => {
            addWriteThunk((prev) =>
              new Map(prev).set(atom, {
                ...getAtomState(atom, prev),
                writeP: undefined,
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
    if (nextPartialState) {
      return concatMap(prevState, nextPartialState)
    }
    return prevState
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

  const readPendingMapRef = useRef<ReadPendingMap>()
  if (!readPendingMapRef.current) {
    readPendingMapRef.current = new WeakMap()
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
      add: <Value>(id: symbol, atom: Atom<Value>) =>
        addAtom(
          id,
          atom,
          setState,
          dependentsMapRef.current as DependentsMap,
          readPendingMapRef.current as ReadPendingMap
        ),
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

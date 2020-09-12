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
import { appendMap, concatMap } from './utils'

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

// dependents for get operation
type DependentsMap = WeakMap<AnyAtom, Set<AnyAtom | symbol>> // symbol is id from useAtom

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
  atom: AnyAtom,
  dependent: AnyAtom | symbol
) => {
  const dependents = dependentsMap.get(atom)
  if (dependents && dependents.has(dependent)) {
    dependents.delete(dependent)
    return dependents.size === 0 // empty
  }
  return false // not found
}

const listDependents = (dependentsMap: DependentsMap, atom: AnyAtom) => {
  const dependents = dependentsMap.get(atom)
  return dependents || new Set<AnyAtom | symbol>()
}

export type AtomState<Value = unknown> = {
  promise: Promise<void> | null
  value: Value
}

type State = Map<AnyAtom, AtomState>

type PartialState = State
type WriteCache = WeakMap<State, Map<symbol, PartialState>> // symbol is writeId

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
  ) => readonly [Promise<void> | null, Value | null, PartialState]
  write: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void
}

const initialState: State = new Map()

const getAtomState = (state: State, atom: AnyAtom) => {
  const atomState = state.get(atom)
  if (!atomState) {
    throw new Error('atom is not initialized')
  }
  return atomState
}

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
  const readAtomValue = <V>(
    prevState: State,
    atom: Atom<V>,
    dependent: AnyAtom | null
  ) => {
    if (dependent) {
      addDependent(dependentsMap, atom, dependent)
    }
    const partialState: PartialState = new Map()
    const atomState = prevState.get(atom) as AtomState<V> | undefined
    if (atomState) {
      return [atomState.promise, atomState.value, partialState] as const
    }
    let promise: Promise<void> | null = null
    let value: V | null = null
    let isSync = true
    try {
      const promiseOrValue = atom.read(((a: AnyAtom) => {
        if (a !== atom) {
          const [nextPromise, nextValue, nextPartialState] = readAtomValue(
            prevState,
            a,
            atom
          )
          if (isSync) {
            appendMap(partialState, nextPartialState)
          } else {
            setState((prev) => appendMap(new Map(prev), nextPartialState))
          }
          if (nextPromise) {
            throw nextPromise
          }
          return nextValue
        }
        // primitive atom
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
        promise = promiseOrValue.then((value) => {
          setState((prev) => new Map(prev).set(atom, { promise: null, value }))
        })
      } else {
        value = promiseOrValue
      }
    } catch (errorOrPromise) {
      if (errorOrPromise instanceof Promise) {
        promise = errorOrPromise
      } else {
        throw errorOrPromise
      }
    }
    partialState.set(
      atom,
      promise ? { promise, value: atom.init } : { promise: null, value }
    )
    isSync = false
    return [promise, value, partialState] as const
  }

  return readAtomValue(state, readingAtom, null)
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
    setState((prev) => appendMap(new Map(prev), partialState))
  }
}

const delAtom = (
  id: symbol,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap,
  gcRequiredRef: MutableRefObject<boolean>
) => {
  const deleteAtomState = (prevState: State, dependent: symbol) => {
    prevState.forEach((_atomState, atom) => {
      deleteDependent(dependentsMap, atom, dependent)
    })
    return prevState
  }

  gcRequiredRef.current = true
  setState((prev) => deleteAtomState(prev, id))
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
  writeCache: WriteCache
) => {
  const updateDependentsState = (prevState: State, atom: AnyAtom) => {
    const partialState: PartialState = new Map()
    listDependents(dependentsMap, atom).forEach((dependent) => {
      if (typeof dependent === 'symbol') return
      const v = dependent.read(((a: AnyAtom) => {
        if (a !== dependent) {
          addDependent(dependentsMap, a, dependent)
        }
        return getAtomStateValue(prevState, a)
      }) as Getter)
      if (v instanceof Promise) {
        const promise = v.then((vv) => {
          const nextAtomState: AtomState = { promise: null, value: vv }
          setState((prev) => {
            const nextState = new Map(prev).set(dependent, nextAtomState)
            const nextPartialState = updateDependentsState(nextState, dependent)
            return appendMap(nextState, nextPartialState)
          })
        })
        partialState.set(dependent, {
          ...getAtomState(prevState, dependent),
          promise,
        })
      } else {
        partialState.set(dependent, {
          promise: null,
          value: v,
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
    writeId: symbol,
    prevState: State,
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => {
    if (!writeCache.has(prevState)) {
      writeCache.set(prevState, new Map())
    }
    const cache = writeCache.get(prevState) as Map<symbol, PartialState>
    const hit = cache.get(writeId)
    if (hit) return hit
    const partialState: PartialState = new Map()
    let isSync = true
    const promise = atom.write(
      ((a: AnyAtom) =>
        getAtomStateValue(concatMap(prevState, partialState), a)) as Getter,
      ((a: AnyWritableAtom, v: unknown) => {
        if (a === atom) {
          const nextAtomState: AtomState = { promise: null, value: v }
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
          const newWriteId = Symbol()
          if (isSync) {
            const nextPartialState = updateAtomState(
              newWriteId,
              prevState,
              a,
              v
            )
            appendMap(partialState, nextPartialState)
          } else {
            setState((prev) => {
              const nextPartialState = updateAtomState(newWriteId, prev, a, v)
              return appendMap(new Map(prev), nextPartialState)
            })
          }
        }
      }) as Setter,
      update
    )
    if (promise instanceof Promise) {
      const nextAtomState: AtomState = {
        ...getAtomState(prevState, atom),
        promise: promise.then(() => {
          setState((prev) =>
            new Map(prev).set(atom, {
              ...getAtomState(prev, atom),
              promise: null,
            })
          )
        }),
      }
      partialState.set(atom, nextAtomState)
    }
    isSync = false
    cache.set(writeId, partialState)
    return partialState
  }

  const newWriteId = Symbol()
  setState((prevState) => {
    const updatingAtomState = prevState.get(updatingAtom)
    if (updatingAtomState && updatingAtomState.promise) {
      // schedule update after promise is resolved
      const promise = updatingAtomState.promise.then(() => {
        const updateState = updateAtomState(
          newWriteId,
          prevState,
          updatingAtom,
          update
        )
        setState((prev) => appendMap(new Map(prev), updateState))
      })
      return new Map(prevState).set(updatingAtom, {
        ...updatingAtomState,
        promise,
      })
    } else {
      const updateState = updateAtomState(
        newWriteId,
        prevState,
        updatingAtom,
        update
      )
      return appendMap(new Map(prevState), updateState)
    }
  })
}

export const ActionsContext = createContext(warningObject as Actions)
export const StateContext = createContext(warningObject as State)

export const Provider: React.FC = ({ children }) => {
  const [state, setState] = useState(initialState)

  const dependentsMapRef = useRef<DependentsMap>()
  if (!dependentsMapRef.current) {
    dependentsMapRef.current = new WeakMap()
  }

  const writeCacheRef = useRef<WriteCache>()
  if (!writeCacheRef.current) {
    writeCacheRef.current = new WeakMap()
  }

  const gcRequiredRef = useRef(false)
  useEffect(() => {
    if (!gcRequiredRef.current) {
      return
    }
    gcAtom(state, setState, dependentsMapRef.current as DependentsMap)
    gcRequiredRef.current = false
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
        delAtom(
          id,
          setState,
          dependentsMapRef.current as DependentsMap,
          gcRequiredRef
        ),
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
          writeCacheRef.current as WriteCache
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

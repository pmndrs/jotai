import React, {
  Dispatch,
  SetStateAction,
  MutableRefObject,
  createElement,
  useMemo,
  useState,
  useRef,
} from 'react'
import { createContext } from 'use-context-selector'

import { AnyAtom, AnyWritableAtom, Getter, Setter } from './types'
import { useIsoLayoutEffect, appendMap, concatMap } from './utils'

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

export type Actions = {
  init: (id: symbol, atom: AnyAtom) => void
  dispose: (id: symbol) => void
  write: (atom: AnyWritableAtom, update: unknown) => void
}

// dependents for get operation
type DependentsMap = WeakMap<AnyAtom, Set<AnyAtom | symbol>> // symbol is id from INIT_ATOM

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
  return atomState ? atomState.value : atom.initialValue
}

const initAtom = (
  id: symbol,
  initializingAtom: AnyAtom,
  stateRef: MutableRefObject<State>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  const createAtomState = (
    prevState: State,
    atom: AnyAtom,
    dependent: AnyAtom | symbol
  ) => {
    addDependent(dependentsMap, atom, dependent)
    const partialState: State = new Map()
    let atomState = prevState.get(atom)
    if (atomState) {
      return partialState // already initialized
    }
    let isSync = true
    const nextValue = atom.read(((a: AnyAtom) => {
      if (a !== atom) {
        if (isSync) {
          const nextPartialState = createAtomState(prevState, a, atom)
          appendMap(partialState, nextPartialState)
        } else {
          const nextPartialState = createAtomState(stateRef.current, a, atom)
          setState((prev) => appendMap(new Map(prev), nextPartialState))
        }
      }
      return getAtomStateValue(prevState, a)
    }) as Getter)
    if (nextValue instanceof Promise) {
      const promise = nextValue.then((value) => {
        setState((prev) => new Map(prev).set(atom, { promise: null, value }))
      })
      atomState = { promise, value: atom.initialValue }
    } else {
      atomState = { promise: null, value: nextValue }
    }
    partialState.set(atom, atomState)
    isSync = false
    return partialState
  }

  const updateState = createAtomState(stateRef.current, initializingAtom, id)
  setState((prevState) => appendMap(new Map(prevState), updateState))
}

const disposeAtom = (
  id: symbol,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  const deleteAtomState = (prevState: State, dependent: AnyAtom | symbol) => {
    let nextState = new Map(prevState)
    const deleted: AnyAtom[] = []
    nextState.forEach((_atomState, atom) => {
      const isEmpty = deleteDependent(dependentsMap, atom, dependent)
      if (isEmpty) {
        nextState.delete(atom)
        deleted.push(atom)
        // TODO delete in dependentsMap too (even though it is WeakMap)
      }
    })
    nextState = deleted.reduce((p, c) => deleteAtomState(p, c), nextState)
    return nextState
  }

  setState((prevState) => deleteAtomState(prevState, id))
}

const writeAtomValue = (
  updatingAtom: AnyWritableAtom,
  update: unknown,
  stateRef: MutableRefObject<State>,
  setState: Dispatch<SetStateAction<State>>,
  dependentsMap: DependentsMap
) => {
  const updateDependentsState = (prevState: State, atom: AnyAtom) => {
    const partialState: State = new Map()
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
          const nextPartialState = updateDependentsState(
            new Map(stateRef.current).set(dependent, nextAtomState),
            dependent
          )
          setState((prev) =>
            appendMap(
              new Map(prev).set(dependent, {
                promise: null,
                value: vv,
              }),
              nextPartialState
            )
          )
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
        appendMap(partialState, updateDependentsState(prevState, dependent))
      }
    })
    return partialState
  }

  const updateAtomState = (
    prevState: State,
    atom: AnyWritableAtom,
    value: unknown
  ) => {
    const partialState: State = new Map()
    let isSync = true
    const promise = atom.write(
      ((a: AnyAtom) => getAtomStateValue(prevState, a)) as Getter,
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
            const nextPartialState = updateDependentsState(
              new Map(stateRef.current).set(a, nextAtomState),
              a
            )
            setState((prev) =>
              appendMap(new Map(prev).set(a, nextAtomState), nextPartialState)
            )
          }
        } else {
          if (isSync) {
            const nextPartialState = updateAtomState(
              concatMap(prevState, partialState),
              a,
              v
            )
            appendMap(partialState, nextPartialState)
          } else {
            const nextPartialState = updateAtomState(stateRef.current, a, v)
            setState((prev) => appendMap(new Map(prev), nextPartialState))
          }
        }
      }) as Setter,
      value
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
    return partialState
  }

  const updatingAtomState = stateRef.current.get(updatingAtom)
  if (updatingAtomState && updatingAtomState.promise) {
    // schedule update after promise is resolved
    const promise = updatingAtomState.promise.then(() => {
      const updateState = updateAtomState(
        stateRef.current,
        updatingAtom,
        update
      )
      setState((prevState) => appendMap(new Map(prevState), updateState))
    })
    setState((prevState) =>
      new Map(prevState).set(updatingAtom, { ...updatingAtomState, promise })
    )
  } else {
    const updateState = updateAtomState(stateRef.current, updatingAtom, update)
    setState((prevState) => appendMap(new Map(prevState), updateState))
  }
}

export const ActionsContext = createContext(warningObject as Actions)
export const StateContext = createContext(warningObject as State)

export const Provider: React.FC = ({ children }) => {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)
  useIsoLayoutEffect(() => {
    stateRef.current = state
  })
  const dependentsMapRef = useRef<DependentsMap>()
  if (!dependentsMapRef.current) {
    dependentsMapRef.current = new WeakMap()
  }
  const actions = useMemo(
    () => ({
      init: (id: symbol, atom: AnyAtom) =>
        initAtom(
          id,
          atom,
          stateRef,
          setState,
          dependentsMapRef.current as DependentsMap
        ),
      dispose: (id: symbol) =>
        disposeAtom(id, setState, dependentsMapRef.current as DependentsMap),
      write: (atom: AnyWritableAtom, update: unknown) =>
        writeAtomValue(
          atom,
          update,
          stateRef,
          setState,
          dependentsMapRef.current as DependentsMap
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

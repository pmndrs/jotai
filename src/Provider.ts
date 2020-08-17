import React, {
  Dispatch,
  SetStateAction,
  createElement,
  useCallback,
  useState,
} from 'react'
import { createContext } from 'use-context-selector'

import { AnyAtom, AnyWritableAtom, Getter, Setter } from './types'

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

type InitAction = {
  type: 'INIT_ATOM'
  atom: AnyAtom
  id: symbol
}

type DisposeAction = {
  type: 'DISPOSE_ATOM'
  atom: AnyAtom
  id: symbol
}

type UpdateAction = {
  type: 'UPDATE_VALUE'
  atom: AnyWritableAtom
  update: SetStateAction<unknown>
}

type Action = InitAction | DisposeAction | UpdateAction

export type AtomState<Value = unknown> = {
  promise: Promise<void> | null
  value: Value
  getDependents: Set<AnyAtom | symbol> // symbol is id from INIT_ATOM
  setDependents: Set<AnyAtom>
}

type State = Map<AnyAtom, AtomState>

const initialState: State = new Map()

const getAllDependents = (state: State, atom: AnyAtom) => {
  const dependents = new Set<AnyAtom>()
  const appendSetDependents = (a: AnyAtom) => {
    const aState = state.get(a)
    if (!aState) return
    aState.setDependents.forEach((dependent) => {
      dependents.add(dependent)
      if (a !== dependent) {
        appendSetDependents(dependent)
      }
    })
  }
  appendSetDependents(atom)
  const appendGetDependents = (a: AnyAtom) => {
    const aState = state.get(a)
    if (!aState) return
    aState.getDependents.forEach((dependent) => {
      if (typeof dependent === 'symbol') return
      dependents.add(dependent)
      appendGetDependents(dependent)
    })
  }
  Array.from(dependents).forEach(appendGetDependents)
  return dependents
}

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

function appendMap<K, V>(dst: Map<K, V>, src: Map<K, V>) {
  src.forEach((v, k) => {
    dst.set(k, v)
  })
  return dst
}

const initAtom = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  atom: AnyAtom,
  dependent: AnyAtom | symbol
) => {
  let atomState = prevState.get(atom)
  if (atomState) {
    const nextAtomState = {
      ...atomState,
      getDependents: new Set(atomState.getDependents).add(dependent),
    }
    return new Map().set(atom, nextAtomState)
  }
  const updateState: State = new Map()
  let isSync = true
  const nextValue = atom.read(((a: AnyAtom) => {
    if (a !== atom) {
      if (isSync) {
        appendMap(updateState, initAtom(prevState, setState, a, atom))
      } else {
        setState((prev) =>
          appendMap(new Map(prev), initAtom(prev, setState, a, atom))
        )
      }
    }
    return getAtomStateValue(prevState, a)
  }) as Getter)
  if (nextValue instanceof Promise) {
    const promise = nextValue.then((value) => {
      setState((prev) =>
        new Map(prev).set(atom, {
          ...getAtomState(prev, atom),
          promise: null,
          value,
        })
      )
    })
    atomState = {
      promise,
      value: atom.initialValue,
      getDependents: new Set(),
      setDependents: new Set(),
    }
  } else {
    atomState = {
      promise: null,
      value: nextValue,
      getDependents: new Set(),
      setDependents: new Set(),
    }
  }
  atomState.getDependents.add(dependent)
  updateState.set(atom, atomState)
  isSync = false
  return updateState
}

const disposeAtom = (prevState: State, dependent: AnyAtom | symbol) => {
  let nextState = new Map(prevState)
  const deleted: AnyAtom[] = []
  nextState.forEach((atomState, atom) => {
    if (atomState.getDependents.has(dependent)) {
      const nextGetDependents = new Set(atomState.getDependents)
      nextGetDependents.delete(dependent)
      if (nextGetDependents.size) {
        nextState.set(atom, {
          ...atomState,
          getDependents: nextGetDependents,
        })
      } else {
        nextState.delete(atom)
        deleted.push(atom)
      }
    }
  })
  nextState = deleted.reduce((p, c) => disposeAtom(p, c), nextState)
  return nextState
}

const updateValue = (
  prevState: State,
  setState: Dispatch<SetStateAction<State>>,
  action: UpdateAction
) => {
  const nextState = new Map(prevState)
  let isSync = true
  const valuesToUpdate = new Map<AnyAtom, unknown>()
  const promises: Promise<void>[] = []
  const allDependents = getAllDependents(nextState, action.atom)

  const getCurrAtomValue = (atom: AnyAtom) => {
    if (valuesToUpdate.has(atom)) {
      return valuesToUpdate.get(atom)
    }
    const atomState = nextState.get(atom)
    return atomState ? atomState.value : atom.initialValue
  }

  const updateDependents = (atom: AnyAtom) => {
    const atomState = nextState.get(atom)
    if (!atomState) return
    atomState.getDependents.forEach((dependent) => {
      if (typeof dependent === 'symbol') return
      const v = dependent.read(((a: AnyAtom) => {
        if (a !== dependent) {
          if (isSync) {
            appendMap(nextState, initAtom(prevState, setState, a, dependent))
          } else {
            setState((prev) =>
              appendMap(new Map(prev), initAtom(prev, setState, a, dependent))
            )
          }
        }
        return getCurrAtomValue(a)
      }) as Getter)
      if (v instanceof Promise) {
        promises.push(
          v.then((vv) => {
            valuesToUpdate.set(dependent, vv)
            allDependents.delete(dependent)
          })
        )
      } else {
        valuesToUpdate.set(dependent, v)
        allDependents.delete(dependent)
      }
      updateDependents(dependent)
    })
  }

  const updateAtomValue = (atom: AnyAtom, value: unknown) => {
    valuesToUpdate.set(atom, value)
    allDependents.delete(atom)
    updateDependents(atom)
  }

  const setValue = (atom: AnyWritableAtom, value: unknown) => {
    const promise = atom.write(
      getCurrAtomValue as Getter,
      ((a: AnyWritableAtom, v: unknown) => {
        if (isSync) {
          const atomState = getAtomState(nextState, atom)
          nextState.set(atom, {
            ...atomState,
            setDependents: new Set(atomState.setDependents).add(a),
          })
        } else {
          setState((prev) => {
            const atomState = getAtomState(prev, atom)
            return new Map(prev).set(atom, {
              ...atomState,
              setDependents: new Set(atomState.setDependents).add(a),
            })
          })
        }
        if (a === atom) {
          updateAtomValue(atom, v)
        } else {
          setValue(a, v)
        }
      }) as Setter,
      value
    )
    if (promise instanceof Promise) {
      promises.push(promise)
    }
  }

  const nextValue =
    typeof action.update === 'function'
      ? action.update(getCurrAtomValue(action.atom))
      : action.update
  setValue(action.atom, nextValue)

  const hasPromises = promises.length > 0
  const resolve = async () => {
    if (promises.length) {
      const promisesToWait = promises.splice(0, promises.length)
      await Promise.all(promisesToWait)
      await resolve()
    } else {
      if (allDependents.size !== 0) {
        throw new Error('allDependents is not empty, maybe a bug')
      }
      setState((prev) => {
        const nextS = new Map(prev)
        valuesToUpdate.forEach((value, atom) => {
          const atomState = getAtomState(nextS, atom)
          nextS.set(atom, { ...atomState, promise: null, value })
        })
        return nextS
      })
    }
  }
  const promise = resolve()

  if (hasPromises) {
    promise.then(() => {
      const atomState = getAtomState(nextState, action.atom)
      nextState.set(action.atom, { ...atomState, promise: null })
    })
    const atomState = getAtomState(nextState, action.atom)
    nextState.set(action.atom, { ...atomState, promise })
  }
  allDependents.forEach((dependent) => {
    const dependentState = getAtomState(nextState, dependent)
    nextState.set(dependent, { ...dependentState, promise })
  })
  valuesToUpdate.forEach((value, atom) => {
    const atomState = getAtomState(nextState, atom)
    nextState.set(atom, { ...atomState, promise: null, value })
  })
  valuesToUpdate.clear()
  isSync = false
  return nextState
}

export const DispatchContext = createContext(warningObject as Dispatch<Action>)
export const StateContext = createContext(warningObject as State)

export const Provider: React.FC = ({ children }) => {
  const [state, setState] = useState(initialState)
  const dispatch = useCallback(
    (action: Action) =>
      setState((prevState) => {
        if (action.type === 'INIT_ATOM') {
          const updateState = initAtom(
            prevState,
            setState,
            action.atom,
            action.id
          )
          return appendMap(new Map(prevState), updateState)
        }
        if (action.type === 'DISPOSE_ATOM') {
          return disposeAtom(prevState, action.id)
        }
        if (action.type === 'UPDATE_VALUE') {
          const atomState = getAtomState(prevState, action.atom)
          if (atomState.promise) {
            const promise = atomState.promise.then(() => {
              setState((prev) => {
                const nextState = updateValue(prev, setState, action)
                return nextState
              })
            })
            return new Map(prevState).set(action.atom, {
              ...atomState,
              promise,
            })
          }
          const nextState = updateValue(prevState, setState, action)
          return nextState
        }
        throw new Error('unexpected action type')
      }),
    []
  )
  return createElement(
    DispatchContext.Provider,
    { value: dispatch },
    createElement(StateContext.Provider, { value: state }, children)
  )
}

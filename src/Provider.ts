import React, {
  Dispatch,
  SetStateAction,
  createElement,
  useCallback,
  useState,
} from 'react'
import { createContext } from 'use-context-selector'

import { Atom, WritableAtom } from './types'

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
  atom: Atom<unknown>
  id: symbol
}

type DisposeAction = {
  type: 'DISPOSE_ATOM'
  atom: Atom<unknown>
  id: symbol
}

type UpdateAction = {
  type: 'UPDATE_VALUE'
  atom: WritableAtom<unknown>
  update: SetStateAction<unknown>
}

type Action = InitAction | DisposeAction | UpdateAction

export type AtomState<Value> = {
  promise: Promise<void> | null
  value: Value
  getDependents: Set<Atom<unknown> | symbol> // symbol is id from INIT_ATOM
  setDependents: Set<Atom<unknown>>
}

type State = Map<Atom<unknown>, AtomState<unknown>>

const initialState: State = new Map()

const getAllDependents = (state: State, atom: Atom<unknown>) => {
  const dependents = new Set<Atom<unknown>>()
  const appendSetDependents = (a: Atom<unknown>) => {
    const aState = state.get(a)
    if (!aState) return
    aState.setDependents.forEach(dependent => {
      dependents.add(dependent)
      if (a !== dependent) {
        appendSetDependents(dependent)
      }
    })
  }
  appendSetDependents(atom)
  const appendGetDependents = (a: Atom<unknown>) => {
    const aState = state.get(a)
    if (!aState) return
    aState.getDependents.forEach(dependent => {
      if (typeof dependent === 'symbol') return
      dependents.add(dependent)
      appendGetDependents(dependent)
    })
  }
  Array.from(dependents).forEach(appendGetDependents)
  return dependents
}

const getAtomState = (state: State, atom: Atom<unknown>) => {
  const atomState = state.get(atom)
  if (!atomState) {
    throw new Error('atom is not initialized')
  }
  return atomState
}

const getAtomStateValue = (state: State, atom: Atom<unknown>) => {
  const atomState = state.get(atom)
  return atomState ? atomState.value : atom.default
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
  atom: Atom<unknown>,
  dependent: Atom<unknown> | symbol
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
  const nextValue = atom.read({
    get: (a: Atom<unknown>) => {
      if (a !== atom) {
        if (isSync) {
          appendMap(updateState, initAtom(prevState, setState, a, atom))
        } else {
          setState(prev =>
            appendMap(new Map(prev), initAtom(prev, setState, a, atom))
          )
        }
      }
      return getAtomStateValue(prevState, a)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  if (nextValue instanceof Promise) {
    const promise = nextValue.then(value => {
      setState(prev =>
        new Map(prev).set(atom, {
          ...getAtomState(prev, atom),
          promise: null,
          value,
        })
      )
    })
    atomState = {
      promise,
      value: atom.default,
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

const disposeAtom = (prevState: State, dependent: Atom<unknown> | symbol) => {
  let nextState = new Map(prevState)
  const deleted: Atom<unknown>[] = []
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
  const valuesToUpdate = new Map<Atom<unknown>, unknown>()
  const promises: Promise<void>[] = []
  const allDependents = getAllDependents(nextState, action.atom)

  const getCurrAtomValue = (atom: Atom<unknown>) => {
    if (valuesToUpdate.has(atom)) {
      return valuesToUpdate.get(atom)
    }
    const atomState = nextState.get(atom)
    return atomState ? atomState.value : atom.default
  }

  const updateDependents = (atom: Atom<unknown>) => {
    const atomState = nextState.get(atom)
    if (!atomState) return
    atomState.getDependents.forEach(dependent => {
      if (typeof dependent === 'symbol') return
      const v = dependent.read({
        get: (a: Atom<unknown>) => {
          if (a !== dependent) {
            if (isSync) {
              appendMap(nextState, initAtom(prevState, setState, a, dependent))
            } else {
              setState(prev =>
                appendMap(new Map(prev), initAtom(prev, setState, a, dependent))
              )
            }
          }
          return getCurrAtomValue(a)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      if (v instanceof Promise) {
        promises.push(
          v.then(vv => {
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

  const updateAtomValue = (atom: Atom<unknown>, value: unknown) => {
    valuesToUpdate.set(atom, value)
    allDependents.delete(atom)
    updateDependents(atom)
  }

  const setValue = (atom: WritableAtom<unknown>, value: unknown) => {
    const promise = atom.write(
      {
        get: getCurrAtomValue,
        set: (a: WritableAtom<unknown>, v: unknown) => {
          if (isSync) {
            const atomState = getAtomState(nextState, a)
            nextState.set(a, {
              ...atomState,
              setDependents: new Set(atomState.setDependents).add(atom),
            })
          } else {
            setState(prev => {
              const atomState = getAtomState(prev, a)
              return new Map(prev).set(a, {
                ...atomState,
                setDependents: new Set(atomState.setDependents).add(atom),
              })
            })
          }
          if (a === atom) {
            updateAtomValue(atom, v)
          } else {
            setValue(a, v)
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
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
      setState(prev => {
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
  allDependents.forEach(dependent => {
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
      setState(prevState => {
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
              setState(prev => {
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

import React, {
  MutableRefObject,
  ReactElement,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useDebugValue,
} from 'react'
import { useContextUpdate } from 'use-context-selector'

import { Atom, WritableAtom, AnyAtom, Scope } from './types'
import {
  AtomState,
  State,
  createState,
  addAtom,
  delAtom,
  readAtom,
  writeAtom,
  commitState,
} from './vanilla'
import { getContexts } from './contexts'

// guessing if it's react experimental channel
const isReactExperimental =
  !!(typeof process === 'object' && process.env.IS_REACT_EXPERIMENTAL) ||
  !!(React as any).unstable_useMutableSource

type ContextUpdate = (t: () => void) => void

const defaultContextUpdate: ContextUpdate = (f) => f()

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
  c: ReturnType<typeof getContexts>[1]
}> = ({ r, c, children }) => {
  const contextUpdate = useContextUpdate(c)
  if (isReactExperimental && r.current === defaultContextUpdate) {
    r.current = (f) => contextUpdate(f)
  }
  return children as ReactElement
}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const contextUpdateRef = useRef<ContextUpdate>(defaultContextUpdate)

  const [state, setState] = useState(() => createState(initialValues))
  const lastStateRef = useRef<State>(state)
  useEffect(() => {
    commitState(state)
    lastStateRef.current = state
  })

  const updateState = useCallback((updater: (prev: State) => State) => {
    commitState(lastStateRef.current)
    lastStateRef.current = updater(lastStateRef.current)
    contextUpdateRef.current(() => {
      commitState(lastStateRef.current)
      setState(lastStateRef.current)
    })
  }, [])

  const actions = useMemo(
    () => ({
      add: <Value>(id: symbol, atom: Atom<Value>) => {
        addAtom(lastStateRef.current, atom, id)
      },
      del: <Value>(id: symbol, atom: Atom<Value>) => {
        delAtom(lastStateRef.current, atom, id)
      },
      read: <Value>(state: State, atom: Atom<Value>) =>
        readAtom(state, updateState, atom),
      write: <Value, Update>(
        atom: WritableAtom<Value, Update>,
        update: Update
      ) => writeAtom(updateState, atom, update),
    }),
    [updateState]
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

const atomToPrintable = (atom: AnyAtom) => atom.debugLabel || atom.toString()

const isAtom = (x: AnyAtom | symbol): x is AnyAtom => typeof x !== 'symbol'

const stateToPrintable = (state: State) =>
  Object.fromEntries(
    [...state.m.entries()].map(([atom, dependents]) => {
      const atomState = state.a.get(atom) || ({} as AtomState)
      return [
        atomToPrintable(atom),
        {
          value: atomState.re || atomState.rp || atomState.wp || atomState.v,
          dependents: [...dependents].filter(isAtom).map(atomToPrintable),
        },
      ]
    })
  )

const useDebugState = (state: State) => {
  useDebugValue(state, stateToPrintable)
}

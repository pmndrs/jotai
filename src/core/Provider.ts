import React, { createElement, useRef, useDebugValue } from 'react'

import type { AnyAtom, Scope } from './types'
import type { AtomState, State } from './vanilla'
import { createStore, getStoreContext } from './contexts'
import { useMutableSource } from './useMutableSource'

const getState = (state: State) => state
// TODO this doesn't trigger re-render so useDebugState can be stale.
const subscribe = (_state: State, _callback: () => void) => () => {}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (storeRef.current == null) {
    // lazy initialization
    storeRef.current = createStore(initialValues)
  }
  const store = storeRef.current as ReturnType<typeof createStore>

  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(useMutableSource(store[0], getState, subscribe))
  }

  const StoreContext = getStoreContext(scope)
  return createElement(StoreContext.Provider, { value: store }, children)
}

const atomToPrintable = (atom: AnyAtom) => atom.debugLabel || atom.toString()

const stateToPrintable = (state: State) =>
  Object.fromEntries(
    Array.from(state.m.entries()).map(([atom, mounted]) => {
      const dependents = mounted.d
      const atomState = state.a.get(atom) || ({} as AtomState)
      return [
        atomToPrintable(atom),
        {
          value: atomState.e || atomState.p || atomState.w || atomState.v,
          dependents: Array.from(dependents).map(atomToPrintable),
        },
      ]
    })
  )

const useDebugState = (state: State) => {
  useDebugValue(state, stateToPrintable)
}

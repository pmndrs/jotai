import React, { createElement, useRef, useDebugValue } from 'react'

import { AnyAtom, Scope } from './types'
import { AtomState, State } from './vanilla'
import {
  Store,
  createStore,
  subscribeToStore,
  getStoreContext,
} from './contexts'
import { useMutableSource } from './useMutableSource'

const getState = (store: Store) => store.s

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (storeRef.current == null) {
    // lazy initialization
    storeRef.current = createStore(initialValues)
  }
  const mutableSource = storeRef.current as ReturnType<typeof createStore>

  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(useMutableSource(mutableSource, getState, subscribeToStore))
  }

  const StoreContext = getStoreContext(scope)
  return createElement(
    StoreContext.Provider,
    { value: mutableSource },
    children
  )
}

const atomToPrintable = (atom: AnyAtom) => atom.debugLabel || atom.toString()

const isAtom = (x: AnyAtom | symbol): x is AnyAtom => typeof x !== 'symbol'

const stateToPrintable = (state: State) =>
  Object.fromEntries(
    Array.from(state.m.entries()).map(([atom, [dependents]]) => {
      const atomState = state.a.get(atom) || ({} as AtomState)
      return [
        atomToPrintable(atom),
        {
          value: atomState.re || atomState.rp || atomState.wp || atomState.v,
          dependents: Array.from(dependents)
            .filter(isAtom)
            .map(atomToPrintable),
        },
      ]
    })
  )

const useDebugState = (state: State) => {
  useDebugValue(state, stateToPrintable)
}

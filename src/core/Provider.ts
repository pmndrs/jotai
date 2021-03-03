import React, { createElement, useCallback, useRef, useDebugValue } from 'react'

import type { AnyAtom, Scope } from './types'
import { subscribeAtom } from './vanilla'
import type { AtomState, State } from './vanilla'
import { createStore, getStoreContext } from './contexts'
import type { Store } from './contexts'
import { useMutableSource } from './useMutableSource'

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test'
  ) {
    /* eslint-disable react-hooks/rules-of-hooks */
    const atomsRef = useRef<AnyAtom[]>([])
    if (storeRef.current === null) {
      // lazy initialization
      storeRef.current = createStore(initialValues, (newAtom) => {
        atomsRef.current.push(newAtom)
      })
    }
    useDebugState(
      storeRef.current as ReturnType<typeof createStore>,
      atomsRef.current
    )
    /* eslint-enable react-hooks/rules-of-hooks */
  } else {
    if (storeRef.current === null) {
      // lazy initialization
      storeRef.current = createStore(initialValues)
    }
  }

  const StoreContext = getStoreContext(scope)
  return createElement(
    StoreContext.Provider,
    { value: storeRef.current as ReturnType<typeof createStore> },
    children
  )
}

const atomToPrintable = (atom: AnyAtom) => atom.debugLabel || atom.toString()

const stateToPrintable = ([state, atoms]: [State, AnyAtom[]]) =>
  Object.fromEntries(
    atoms.flatMap((atom) => {
      const mounted = state.m.get(atom)
      if (!mounted) {
        return []
      }
      const dependents = mounted.d
      const atomState = state.a.get(atom) || ({} as AtomState)
      return [
        [
          atomToPrintable(atom),
          {
            value: atomState.e || atomState.p || atomState.w || atomState.v,
            dependents: Array.from(dependents).map(atomToPrintable),
          },
        ],
      ]
    })
  )

const getState = (state: State) => ({ ...state }) // shallow copy

// We keep a reference to the atoms in Provider's atomsRef in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (store: Store, atoms: AnyAtom[]) => {
  const subscribe = useCallback(
    (state: State, callback: () => void) => {
      // FIXME we don't need to resubscribe, just need to subscribe for new one
      const unsubs = atoms.map((atom) => subscribeAtom(state, atom, callback))
      return () => {
        unsubs.forEach((unsub) => unsub())
      }
    },
    [atoms]
  )
  const state = useMutableSource(store[0], getState, subscribe)
  useDebugValue([state, atoms], stateToPrintable)
}

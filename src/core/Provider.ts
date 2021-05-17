import React, { createElement, useRef, useDebugValue } from 'react'

import type { AnyAtom, Scope } from './types'
import type { AtomState, State } from './vanilla'
import type { StoreForDevelopment, Store } from './contexts'
import { createStore, getStoreContext } from './contexts'
import { useMutableSource } from './useMutableSource'

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (storeRef.current === null) {
    // lazy initialization
    storeRef.current = createStore(initialValues)
  }

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    isDevStore(storeRef.current)
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(storeRef.current)
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

const isDevStore = (store: Store): store is StoreForDevelopment => {
  return store.length > 2
}
export const getDebugStateAndAtoms = ({
  atoms,
  state,
}: {
  atoms: AnyAtom[]
  state: State
}) => [state, atoms]
export const subscribeDebugStore = (
  { listeners }: { listeners: Set<() => void> },
  callback: () => void
) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (store: StoreForDevelopment) => {
  const [, , debugMutableSource] = store
  const [state, atoms]: [State, AnyAtom[]] = useMutableSource(
    debugMutableSource,
    getDebugStateAndAtoms,
    subscribeDebugStore
  )
  useDebugValue([state, atoms], stateToPrintable)
}

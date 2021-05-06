import React, { createElement, useCallback, useRef, useDebugValue } from 'react'

import type { AnyAtom, Scope } from './types'
import { subscribeAtom } from './vanilla'
import type { AtomState, State } from './vanilla'
import { createStore, getStoreContext, StoreForDevelopment } from './contexts'
import type { Store } from './contexts'
import { useMutableSource } from './useMutableSource'

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const storeRef = useRef(createStore(initialValues))

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    isDevStore(storeRef.current)
  ) {
    /* eslint-disable react-hooks/rules-of-hooks */
    useDebugState(storeRef.current)
    /* eslint-enable react-hooks/rules-of-hooks */
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

export const getState = (state: State) => ({ ...state }) // shallow copy
export const getAtoms = ({ atoms }: { atoms: AnyAtom[] }) => atoms
export const subscribeAtoms = (
  { listeners }: { listeners: Set<() => void> },
  callback: () => void
) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (store: StoreForDevelopment) => {
  const [stateMutableSource, , atomsMutableSource] = store
  const atoms: AnyAtom[] = useMutableSource(
    atomsMutableSource,
    getAtoms,
    subscribeAtoms
  )
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
  const state = useMutableSource(stateMutableSource, getState, subscribe)
  useDebugValue([state, atoms], stateToPrintable)
}

function isDevStore(store: Store): store is StoreForDevelopment {
  return store.length > 2
}

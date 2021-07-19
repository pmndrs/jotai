import { PropsWithChildren, createElement, useDebugValue, useRef } from 'react'
import type { Atom, Scope } from './atom'
import { createStore, getStoreContext, isDevStore } from './contexts'
import type { StoreForDevelopment } from './contexts'
import { useMutableSource } from './useMutableSource'
import type { AtomState, State } from './vanilla'

export const Provider = ({
  initialValues,
  scope,
  children,
}: PropsWithChildren<{
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
  scope?: Scope
}>) => {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null)
  if (storeRef.current === null) {
    // lazy initialization
    storeRef.current = createStore(initialValues)
  }

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
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

const atomToPrintable = (atom: Atom<unknown>) =>
  atom.debugLabel || atom.toString()

const stateToPrintable = ([state, atoms]: [State, Atom<unknown>[]]) =>
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

export const getDebugStateAndAtoms = ({
  atoms,
  state,
}: {
  atoms: Atom<unknown>[]
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
  const debugMutableSource = store[3]
  const [state, atoms]: [State, Atom<unknown>[]] = useMutableSource(
    debugMutableSource,
    getDebugStateAndAtoms,
    subscribeDebugStore
  )
  useDebugValue([state, atoms], stateToPrintable)
}

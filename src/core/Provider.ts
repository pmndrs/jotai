import { createElement, useDebugValue, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import type { Atom, Scope } from './atom'
import {
  createScopeContainer,
  getScopeContext,
  isDevScopeContainer,
} from './contexts'
import type { ScopeContainerForDevelopment } from './contexts'
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
  const scopeContainerRef = useRef<ReturnType<
    typeof createScopeContainer
  > | null>(null)
  if (scopeContainerRef.current === null) {
    // lazy initialization
    scopeContainerRef.current = createScopeContainer(initialValues)
  }

  if (
    typeof process === 'object' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
    isDevScopeContainer(scopeContainerRef.current)
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(scopeContainerRef.current)
  }

  const ScopeContainerContext = getScopeContext(scope)
  return createElement(
    ScopeContainerContext.Provider,
    {
      value: scopeContainerRef.current as ReturnType<
        typeof createScopeContainer
      >,
    },
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
}) => [state, atoms] as const

export const subscribeDebugScopeContainer = (
  { listeners }: { listeners: Set<() => void> },
  callback: () => void
) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
const useDebugState = (scopeContainer: ScopeContainerForDevelopment) => {
  const debugMutableSource = scopeContainer[4]
  const [state, atoms] = useMutableSource(
    debugMutableSource,
    getDebugStateAndAtoms,
    subscribeDebugScopeContainer
  )
  useDebugValue([state, atoms], stateToPrintable)
}

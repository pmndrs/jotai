import React, {
  MutableRefObject,
  ReactElement,
  createElement,
  useEffect,
  useMemo,
  useState,
  useRef,
  useDebugValue,
} from 'react'
import { useContextUpdate } from 'use-context-selector'

import { AnyAtom, Scope } from './types'
import {
  AtomState,
  State,
  UpdateState,
  createState,
  commitState,
} from './vanilla'
import { getStoreContext } from './contexts'

// guessing if it's react experimental channel
const isReactExperimental =
  !!(typeof process === 'object' && process.env.IS_REACT_EXPERIMENTAL) ||
  !!(React as any).unstable_useMutableSource

type ContextUpdate = (t: () => void) => void

const defaultContextUpdate: ContextUpdate = (f) => f()

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
  c: ReturnType<typeof getStoreContext>
}> = ({ r, c, children }) => {
  const contextUpdate = useContextUpdate(c)
  if (isReactExperimental && r.current === defaultContextUpdate) {
    r.current = (f) => contextUpdate(f)
  }
  return (children as ReactElement) ?? null
}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const contextUpdateRef = useRef<ContextUpdate>(defaultContextUpdate)

  const [state, setState] = useState(() => createState(initialValues))
  const lastStateRef = useRef(state)
  const updateState = useMemo(() => {
    type Updater = Parameters<UpdateState>[0]
    const queue: Updater[] = []
    return (updater: Updater) => {
      queue.push(updater)
      if (queue.length > 1) {
        return
      }
      while (queue.length) {
        lastStateRef.current = queue[0](lastStateRef.current)
        queue.shift()
      }
      contextUpdateRef.current(() => {
        setState(lastStateRef.current)
      })
    }
  }, [])
  useEffect(() => {
    commitState(state, updateState)
  })

  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDebugState(state)
  }
  const StoreContext = getStoreContext(scope)
  return createElement(
    StoreContext.Provider,
    { value: { s: state, u: updateState } },
    createElement(
      InnerProvider,
      { r: contextUpdateRef, c: StoreContext },
      children
    )
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

import React, {
  SetStateAction,
  MutableRefObject,
  ReactElement,
  createElement,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
  useDebugValue,
} from 'react'
import {
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler'
import { useContextUpdate } from 'use-context-selector'

import { Atom, WritableAtom, AnyAtom, Scope } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
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
type WriteThunk = () => void

const runWriteThunk = (
  isLastStateValidRef: MutableRefObject<boolean>,
  writeThunkQueue: WriteThunk[]
) => {
  while (true) {
    if (!isLastStateValidRef.current || !writeThunkQueue.length) {
      return
    }
    const thunk = writeThunkQueue.shift() as WriteThunk
    thunk()
  }
}

const InnerProvider: React.FC<{
  r: MutableRefObject<ContextUpdate | undefined>
  c: ReturnType<typeof getContexts>[1]
}> = ({ r, c, children }) => {
  const contextUpdate = useContextUpdate(c)
  useIsoLayoutEffect(() => {
    if (isReactExperimental) {
      r.current = (f) => {
        contextUpdate(() => {
          runWithPriority(UserBlockingPriority, f)
        })
      }
    } else {
      r.current = (f) => {
        f()
      }
    }
  }, [contextUpdate])
  return children as ReactElement
}

export const Provider: React.FC<{
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
  scope?: Scope
}> = ({ initialValues, scope, children }) => {
  const contextUpdateRef = useRef<ContextUpdate>()

  const [state, setStateOrig] = useState(() => createState(initialValues))
  const lastStateRef = useRef<State>(state)
  const isLastStateValidRef = useRef(false)
  const setState = useCallback((setStateAction: SetStateAction<State>) => {
    isLastStateValidRef.current = false
    setStateOrig(setStateAction)
  }, [])

  useIsoLayoutEffect(() => {
    commitState(state)
    lastStateRef.current = state
    isLastStateValidRef.current = true
  })

  const writeThunkQueueRef = useRef<WriteThunk[]>([])
  useEffect(() => {
    runWriteThunk(isLastStateValidRef, writeThunkQueueRef.current)
  })

  const actions = useMemo(
    () => ({
      add: <Value>(id: symbol, atom: Atom<Value>) => {
        addAtom(lastStateRef.current, atom, id)
      },
      del: <Value>(id: symbol, atom: Atom<Value>) => {
        delAtom(lastStateRef.current, atom, id)
      },
      read: <Value>(state: State, atom: Atom<Value>) =>
        readAtom(state, setState, atom),
      write: <Value, Update>(
        atom: WritableAtom<Value, Update>,
        update: Update
      ) => {
        if (isLastStateValidRef.current) {
          return writeAtom(lastStateRef.current, setState, atom, update)
        }
        const promise = new Promise<void>((resolve, reject) => {
          writeThunkQueueRef.current.push(() => {
            Promise.resolve(
              writeAtom(lastStateRef.current, setState, atom, update)
            ).then(resolve, reject)
          })
        })
        return promise
      },
    }),
    [setState]
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

const atomToPrintable = (atom: AnyAtom) =>
  `${atom.key}:${atom.debugLabel ?? '<no debugLabel>'}`

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

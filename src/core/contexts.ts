import { createContext } from 'use-context-selector'

import { Atom, WritableAtom, Scope } from './types'
import { AtomState, State } from './vanilla'

export type Actions = {
  add: <Value>(atom: Atom<Value>, id: symbol) => void
  del: <Value>(atom: Atom<Value>, id: symbol) => void
  read: <Value>(state: State, atom: Atom<Value>) => AtomState<Value>
  write: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void | Promise<void>
}

// dummy function for typing
const createContexts = () =>
  [
    createContext<Actions | null>(null),
    createContext<State | null>(null),
  ] as const

type Contexts = ReturnType<typeof createContexts>

const ContextsMap = new Map<Scope | undefined, Contexts>()

export const getContexts = (scope?: Scope) => {
  if (!ContextsMap.has(scope)) {
    ContextsMap.set(scope, [
      createContext<Actions | null>(null),
      createContext<State | null>(null),
    ])
  }
  return ContextsMap.get(scope) as Contexts
}

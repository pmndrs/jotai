import { createContext } from 'use-context-selector'

import { Atom, WritableAtom, AnyAtom, Scope } from './types'
import { ImmutableMap } from './immutableMap'

type Revision = number

export type AtomState<Value = unknown> = {
  readE?: Error // read error
  readP?: Promise<void> // read promise
  writeP?: Promise<void> // write promise
  value?: Value
  rev: Revision
  deps: Map<AnyAtom, Revision> // read dependencies
}

export type State = ImmutableMap<AnyAtom, AtomState>

export type Actions = {
  add: <Value>(id: symbol, atom: Atom<Value>) => void
  del: <Value>(id: symbol, atom: Atom<Value>) => void
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

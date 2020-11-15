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

const createContexts = () =>
  [
    createContext<Actions | null>(null),
    createContext<State | null>(null),
  ] as const

const ContextsMap = new Map<
  Scope | undefined,
  ReturnType<typeof createContexts>
>()

export const getContexts = (scope?: Scope) => {
  if (!ContextsMap.has(scope)) {
    ContextsMap.set(scope, [
      createContext<Actions | null>(null),
      createContext<State | null>(null),
    ])
  }
  return ContextsMap.get(scope) as ReturnType<typeof createContexts>
}

import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope } from './atom'
import { createStore } from './store'
import type { Store } from './store'

type VersionedWrite = (write: (version?: object) => void) => void

export type ScopeContainer = {
  s: Store
  w?: VersionedWrite
}

export const createScopeContainer = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
): ScopeContainer => {
  const store = createStore(initialValues)
  return { s: store }
}

type ScopeContext = Context<ScopeContainer>

const ScopeContextMap = new Map<Scope | undefined, ScopeContext>()

export const getScopeContext = (scope?: Scope) => {
  if (!ScopeContextMap.has(scope)) {
    ScopeContextMap.set(scope, createContext(createScopeContainer()))
  }
  return ScopeContextMap.get(scope) as ScopeContext
}

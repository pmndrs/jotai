import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope } from './atom'
import { createStore, createStoreForExport } from './store'
import type { Store } from './store'

type VersionedWrite = (write: (version?: object) => void) => void

export type ScopeContainer = {
  s: Store
  w?: VersionedWrite
}

export const createScopeContainer = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>,
  unstable_createStore?: typeof createStoreForExport
): ScopeContainer => {
  const store = unstable_createStore
    ? unstable_createStore(initialValues).SECRET_INTERNAL_store
    : createStore(initialValues)
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

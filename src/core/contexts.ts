import { createContext } from 'react'
import type { Context } from 'react'
import type { Atom, Scope } from './atom'
import { VERSION_OBJECT, createStore } from './store'
import type { Store } from './store'

type GetVersion = (forWrite?: boolean) => object | undefined

export type ScopeContainer = {
  s: Store
  v: GetVersion
}

export const createScopeContainer = (
  initialValues?: Iterable<readonly [Atom<unknown>, unknown]>
): ScopeContainer => {
  const store = createStore(initialValues)
  const getVersion = (forWrite?: boolean) => {
    if (
      typeof process === 'object' &&
      process.env.JOTAI_EXPERIMENTAL_VERSION_OBJECT === 'true'
    ) {
      if (forWrite) {
        // TODO this doesn't work
        // return new Object()
        return undefined
      }
      return store[VERSION_OBJECT]()
    }
  }
  return { s: store, v: getVersion }
}

type ScopeContext = Context<ScopeContainer>

const ScopeContextMap = new Map<Scope | undefined, ScopeContext>()

export const getScopeContext = (scope?: Scope) => {
  if (!ScopeContextMap.has(scope)) {
    ScopeContextMap.set(scope, createContext(createScopeContainer()))
  }
  return ScopeContextMap.get(scope) as ScopeContext
}

import { createContext } from 'use-context-selector'

import { Scope } from './types'
import { State, UpdateState } from './vanilla'

export type Store = readonly [State, UpdateState]

const createStoreContext = () => createContext<Store | null>(null)

type StoreContext = ReturnType<typeof createStoreContext>

const StoreContextMap = new Map<Scope | undefined, StoreContext>()

export const getStoreContext = (scope?: Scope) => {
  if (!StoreContextMap.has(scope)) {
    StoreContextMap.set(scope, createStoreContext())
  }
  return StoreContextMap.get(scope) as StoreContext
}

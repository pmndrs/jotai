import { createContext } from 'react'
import type { Context } from 'react'

import type { AnyAtom, Scope } from './types'
import { UpdateState, createState } from './vanilla'
import { createMutableSource } from './useMutableSource'

type MutableSource = ReturnType<typeof createMutableSource>

export type Store = [mutableSource: MutableSource, updateState: UpdateState]

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): Store => {
  const state = createState(initialValues)
  const mutableSource = createMutableSource(state, () => state.v)
  return [mutableSource, state.u]
}

type StoreContext = Context<ReturnType<typeof createStore>>

// export only for tests/error.test.tsx
export const StoreContextMap = new Map<Scope | undefined, StoreContext>()

export const getStoreContext = (scope?: Scope) => {
  if (!StoreContextMap.has(scope)) {
    StoreContextMap.set(scope, createContext(createStore()))
  }
  return StoreContextMap.get(scope) as StoreContext
}

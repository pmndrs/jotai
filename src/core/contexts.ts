import { createContext } from 'react'
import type { Context } from 'react'

import type { AnyAtom, WritableAtom, Scope } from './types'
import { createState, writeAtom } from './vanilla'
import { createMutableSource } from './useMutableSource'

type MutableSource = ReturnType<typeof createMutableSource>

export type Store = [
  mutableSource: MutableSource,
  updateAtom: <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => void | Promise<void>
]

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): Store => {
  const state = createState(initialValues)
  const mutableSource = createMutableSource(state, () => state.v)
  const updateAtom = <Value, Update>(
    atom: WritableAtom<Value, Update>,
    update: Update
  ) => writeAtom(state, atom, update)
  return [mutableSource, updateAtom]
}

type StoreContext = Context<Store>

// export only for tests/error.test.tsx
export const StoreContextMap = new Map<Scope | undefined, StoreContext>()

export const getStoreContext = (scope?: Scope) => {
  if (!StoreContextMap.has(scope)) {
    StoreContextMap.set(scope, createContext(createStore()))
  }
  return StoreContextMap.get(scope) as StoreContext
}

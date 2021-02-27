import { createContext } from 'react'
import type { Context } from 'react'

import type { AnyAtom, Scope } from './types'
import { State, UpdateState, createState } from './vanilla'
import { createMutableSource } from './useMutableSource'

type MutableSource = ReturnType<typeof createMutableSource>

export type Store = [
  mutableSource: MutableSource,
  updateState: UpdateState,
  getState: () => State
]

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
): Store => {
  let state = createState(initialValues)
  type Updater = Parameters<UpdateState>[0]
  const queue: Updater[] = []
  const updateState = (updater: Updater) => {
    queue.push(updater)
    if (queue.length > 1) {
      return
    }
    let nextState = state
    while (queue.length) {
      nextState = queue[0](nextState)
      queue.shift()
    }
    if (nextState !== state) {
      state = nextState
      state.m.forEach((mounted) => {
        mounted.l.forEach((listener) => listener())
      })
    }
  }
  const getState = () => state
  const mutableSource = createMutableSource({ s: getState }, () => state)
  return [mutableSource, updateState, getState]
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

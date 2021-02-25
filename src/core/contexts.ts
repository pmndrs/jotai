import { createContext } from 'react'
import type { Context } from 'react'

import type { AnyAtom, Scope } from './types'
import { UpdateState, createState } from './vanilla'
import { createMutableSource } from './useMutableSource'

type MutableSource = ReturnType<typeof createMutableSource>

export type Store = [mutableSource: MutableSource, updateState: UpdateState]

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
) => {
  let state = createState(initialValues)
  const listeners = new Set<() => void>()
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
      listeners.forEach((listener) => listener())
    }
  }
  const mutableSource = createMutableSource(
    { s: () => state, l: listeners },
    () => state
  )
  return [mutableSource, updateState]
}

export const subscribeToStore = (source: any, callback: () => void) => {
  source.l.add(callback)
  return () => {
    source.l.delete(callback)
  }
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

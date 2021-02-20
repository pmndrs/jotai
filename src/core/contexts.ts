import { Context, createContext } from 'react'

import { AnyAtom, Scope } from './types'
import { State, UpdateState, createState } from './vanilla'
import { createMutableSource } from './useMutableSource'

export type Store = {
  /* state       */ s: State
  /* updateState */ u: UpdateState
  /* listeners   */ l: Set<() => void>
}

export const createStore = (
  initialValues?: Iterable<readonly [AnyAtom, unknown]>
) => {
  const store: Store = {
    s: createState(initialValues),
    u: () => {},
    l: new Set(),
  }
  type Updater = Parameters<UpdateState>[0]
  const queue: Updater[] = []
  const updateState = (updater: Updater) => {
    queue.push(updater)
    if (queue.length > 1) {
      return
    }
    let nextState = store.s
    while (queue.length) {
      nextState = queue[0](nextState)
      queue.shift()
    }
    if (nextState !== store.s) {
      store.s = nextState
      store.l.forEach((listener) => listener())
    }
  }
  store.u = updateState
  return createMutableSource(store, () => store.s)
}

export const subscribeToStore = (store: Store, callback: () => void) => {
  store.l.add(callback)
  return () => {
    store.l.delete(callback)
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

import { createContext } from 'use-context-selector'

import { Scope } from './types'
import { State, UpdateState, createState, commitState } from './vanilla'
import { createMutableSource } from './useMutableSource'

export type MutableSource = ReturnType<typeof createMutableSource>

export type Store = {
  /* provider state */ s?: State
  /* updateState    */ u: UpdateState
  /* mutable source */ m: MutableSource
}

const createStoreContext = () => {
  const source = {
    s: createState(),
    l: new Set<() => void>(),
  }
  type Updater = Parameters<UpdateState>[0]
  const queue: Updater[] = []
  const updateState = (updater: Updater) => {
    queue.push(updater)
    if (queue.length > 1) {
      return
    }
    while (queue.length) {
      source.s = queue[0](source.s)
      queue.shift()
    }
    commitState(source.s, updateState)
    source.l.forEach((listener) => listener())
  }
  const mutableSource = createMutableSource(source, () => source.s)
  return createContext<Store>({
    u: updateState,
    m: mutableSource,
  })
}

type StoreContext = ReturnType<typeof createStoreContext>

const StoreContextMap = new Map<Scope | undefined, StoreContext>()

export const getStoreContext = (scope?: Scope) => {
  if (!StoreContextMap.has(scope)) {
    StoreContextMap.set(scope, createStoreContext())
  }
  return StoreContextMap.get(scope) as StoreContext
}

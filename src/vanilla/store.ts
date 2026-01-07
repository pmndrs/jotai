import { INTERNAL_buildStoreRev2 as INTERNAL_buildStore } from './internals.ts'
import type { INTERNAL_Store } from './internals.ts'

export type Store = INTERNAL_Store

let overiddenCreateStore: typeof createStore | undefined

export function INTERNAL_overrideCreateStore(
  fn: (prev: typeof createStore | undefined) => typeof createStore,
): void {
  overiddenCreateStore = fn(overiddenCreateStore)
}

export function createStore(): Store {
  if (overiddenCreateStore) {
    return overiddenCreateStore()
  }
  return INTERNAL_buildStore()
}

let defaultStore: Store | undefined

export function getDefaultStore(): Store {
  if (!defaultStore) {
    defaultStore = createStore()
    if (import.meta.env?.MODE !== 'production') {
      ;(globalThis as any).__JOTAI_DEFAULT_STORE__ ||= defaultStore
      if ((globalThis as any).__JOTAI_DEFAULT_STORE__ !== defaultStore) {
        console.warn(
          'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
        )
      }
    }
  }
  return defaultStore
}

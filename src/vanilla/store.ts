import { INTERNAL_buildStoreRev3 as INTERNAL_buildStore } from './internals.js'
import type { INTERNAL_Store } from './internals.js'

export type Store = INTERNAL_Store

let overriddenCreateStore: typeof createStore | undefined

export function INTERNAL_overrideCreateStore(
  fn: (prev: typeof createStore | undefined) => typeof createStore,
): void {
  overriddenCreateStore = fn(overriddenCreateStore)
}

export function createStore(): Store {
  if (overriddenCreateStore) {
    return overriddenCreateStore()
  }
  return INTERNAL_buildStore()
}

let defaultStore: Store | undefined

export function getDefaultStore(): Store {
  if (!defaultStore) {
    defaultStore = createStore()
    if (process.env.NODE_ENV !== 'production') {
      ;(
        globalThis as { __JOTAI_DEFAULT_STORE__?: unknown }
      ).__JOTAI_DEFAULT_STORE__ ||= defaultStore
      if (
        (globalThis as { __JOTAI_DEFAULT_STORE__?: unknown })
          .__JOTAI_DEFAULT_STORE__ !== defaultStore
      ) {
        console.warn(
          'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
        )
      }
    }
  }
  return defaultStore
}

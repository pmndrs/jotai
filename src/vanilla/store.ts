import { INTERNAL_buildStoreRev2 as INTERNAL_buildStore } from './internals.ts'
import type { INTERNAL_Store } from './internals.ts'

export type Store = INTERNAL_Store

let overriddenCreateStore: typeof createStore | undefined

export function INTERNAL_overrideCreateStore(
  fn: (prev: typeof createStore | undefined) => typeof createStore,
): void {
  overriddenCreateStore = fn(overriddenCreateStore)
}

export function createStore(unstable_isDefaultStore?: boolean): Store {
  if (overriddenCreateStore) {
    return overriddenCreateStore(unstable_isDefaultStore)
  }
  if (!unstable_isDefaultStore) {
    return INTERNAL_buildStore()
  }

  defaultStore ||= INTERNAL_buildStore()
  if (import.meta.env?.MODE !== 'production') {
    ;(globalThis as any).__JOTAI_DEFAULT_STORE__ ||= defaultStore
    if ((globalThis as any).__JOTAI_DEFAULT_STORE__ !== defaultStore) {
      console.warn(
        'Detected multiple Jotai instances. It may cause unexpected behavior with the default store. https://github.com/pmndrs/jotai/discussions/2044',
      )
    }
  }

  return defaultStore
}

let defaultStore: Store | undefined

export function getDefaultStore(): Store {
  return createStore(true)
}

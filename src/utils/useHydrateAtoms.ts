import { useContext } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import type { Store } from '../core/contexts'

const hydratedMap: WeakMap<Store, WeakSet<Atom<unknown>>> = new WeakMap()

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown>, unknown]>,
  scope?: Scope
) {
  const StoreContext = getStoreContext(scope)
  const store = useContext(StoreContext)
  const restoreAtoms = store[3]

  const hydratedSet = getHydratedSet(store)
  const tuplesToRestore = []
  for (const tuple of values) {
    const atom = tuple[0]
    if (!hydratedSet.has(atom)) {
      hydratedSet.add(atom)
      tuplesToRestore.push(tuple)
    }
  }
  if (tuplesToRestore.length) {
    restoreAtoms(tuplesToRestore)
  }
}

function getHydratedSet(store: Store) {
  let hydratedSet = hydratedMap.get(store)
  if (!hydratedSet) {
    hydratedSet = new Set()
    hydratedMap.set(store, hydratedSet)
  }
  return hydratedSet
}

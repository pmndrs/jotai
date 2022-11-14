import { useStore } from 'jotai/react'
import type { Atom } from 'jotai/vanilla'

type Store = ReturnType<typeof useStore>
type Options = Parameters<typeof useStore>[0]

const hydratedMap: WeakMap<Store, WeakSet<Atom<unknown>>> = new WeakMap()

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown>, unknown]>,
  options?: Options
) {
  const store = useStore(options)

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
    store.res(tuplesToRestore)
  }
}

const getHydratedSet = (store: Store) => {
  let hydratedSet = hydratedMap.get(store)
  if (!hydratedSet) {
    hydratedSet = new WeakSet()
    hydratedMap.set(store, hydratedSet)
  }
  return hydratedSet
}

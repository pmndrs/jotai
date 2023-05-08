import { useStore } from '../../react.ts'
import type {
  AnyWritableAtom,
  AtomMap,
  AtomTuple,
  InferAtoms,
  Options,
} from './typeUtils.ts'

type Store = ReturnType<typeof useStore>

const hydratedMap: WeakMap<Store, WeakSet<AnyWritableAtom>> = new WeakMap()

export function useHydrateAtoms<T extends Array<AtomTuple>>(
  values: InferAtoms<T>,
  options?: Options
): void
export function useHydrateAtoms<T extends AtomMap>(
  values: T,
  options?: Options
): void
export function useHydrateAtoms<T extends Iterable<AtomTuple>>(
  values: InferAtoms<T>,
  options?: Options
): void
export function useHydrateAtoms<T extends Iterable<AtomTuple>>(
  values: InferAtoms<T>,
  options?: Options
) {
  const store = useStore(options)

  const hydratedSet = getHydratedSet(store)
  for (const [atom, value] of values) {
    if (!hydratedSet.has(atom)) {
      hydratedSet.add(atom)
      store.set(atom, value)
    }
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

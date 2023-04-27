import { useStore } from '../../react.ts'
import type { WritableAtom } from '../../vanilla.ts'

type Store = ReturnType<typeof useStore>
type Options = Parameters<typeof useStore>[0]
type AnyWritableAtom = WritableAtom<unknown, any[], any>
type AtomTuple<A = AnyWritableAtom, V = unknown> = readonly [A, V]

type InferAtoms<T extends Iterable<AtomTuple>> = {
  [K in keyof T]: T[K] extends AtomTuple<infer A>
    ? A extends AnyWritableAtom
      ? AtomTuple<A, ReturnType<A['read']>>
      : T[K]
    : any
}

const hydratedMap: WeakMap<Store, WeakSet<AnyWritableAtom>> = new WeakMap()

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

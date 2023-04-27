import { useStore } from '../../react.ts'
import type { WritableAtom } from '../../vanilla.ts'

type Store = ReturnType<typeof useStore>
type Options = Parameters<typeof useStore>[0]
type AnyWritableAtom = WritableAtom<unknown, any[], any>
type AtomTuple<A = AnyWritableAtom, V = unknown> = readonly [A, V]
type InferAtoms<
  T extends Array<AtomTuple>,
  S extends Array<AtomTuple> = []
> = S['length'] extends T['length']
  ? S
  : T extends Array<AtomTuple<infer A>>
  ? A extends AnyWritableAtom
    ? InferAtoms<T, [AtomTuple<A, ReturnType<A['read']>>, ...S]>
    : T
  : T

const hydratedMap: WeakMap<Store, WeakSet<AnyWritableAtom>> = new WeakMap()

export function useHydrateAtoms<T extends Array<AtomTuple>>(
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

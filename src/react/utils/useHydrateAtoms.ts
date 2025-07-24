import { useStore } from '../../react.ts'
import type { WritableAtom } from '../../vanilla.ts'

type Store = ReturnType<typeof useStore>
type Options = Parameters<typeof useStore>[0] & {
  dangerouslyForceHydrate?: boolean
}
type AnyWritableAtom = WritableAtom<unknown, never[], unknown>

type InferAtomTuples<T> = {
  [K in keyof T]: T[K] extends readonly [infer A, unknown]
    ? A extends WritableAtom<unknown, infer Args, infer _Result>
      ? readonly [A, ...Args]
      : T[K]
    : never
}

// For internal use only
// This can be changed without notice.
export type INTERNAL_InferAtomTuples<T> = InferAtomTuples<T>

const hydratedMap: WeakMap<Store, WeakSet<AnyWritableAtom>> = new WeakMap()

export function useHydrateAtoms<
  T extends (readonly [AnyWritableAtom, ...unknown[]])[],
>(values: InferAtomTuples<T>, options?: Options): void

export function useHydrateAtoms<T extends Map<AnyWritableAtom, unknown>>(
  values: T,
  options?: Options,
): void

export function useHydrateAtoms<
  T extends Iterable<readonly [AnyWritableAtom, ...unknown[]]>,
>(values: InferAtomTuples<T>, options?: Options): void

export function useHydrateAtoms<
  T extends Iterable<readonly [AnyWritableAtom, ...unknown[]]>,
>(values: T, options?: Options) {
  const store = useStore(options)

  const hydratedSet = getHydratedSet(store)
  for (const [atom, ...args] of values) {
    if (!hydratedSet.has(atom) || options?.dangerouslyForceHydrate) {
      hydratedSet.add(atom)
      store.set(atom, ...(args as never[]))
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

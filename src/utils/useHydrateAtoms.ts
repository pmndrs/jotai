import { useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'

const hydratedSymbol = Symbol()

export function useHydrateAtoms(
  values: Iterable<
    readonly [Atom<unknown> & { [hydratedSymbol]?: boolean }, unknown]
  >,
  scope?: Scope
) {
  const StoreContext = getStoreContext(scope)
  const restoreAtoms = useContext(StoreContext)[3]

  useMemo(() => {
    const tuplesToRestore = []
    for (const tuple of values) {
      const atom = tuple[0]
      if (atom[hydratedSymbol] !== true) {
        tuplesToRestore.push(tuple)
        atom[hydratedSymbol] = true
      }
    }
    restoreAtoms(tuplesToRestore)
  }, [values, restoreAtoms])
}

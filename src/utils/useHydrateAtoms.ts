import { useContext, useMemo } from 'react'
import { SECRET_INTERNAL_getStoreContext as getStoreContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown> & { hydrated: Symbol }, unknown]>,
  scope?: Scope
) {
  const StoreContext = getStoreContext(scope)
  const restoreAtoms = useContext(StoreContext)[3]

  useMemo(() => {
    const tuplesToRestore = []
    for (const tuple of values) {
      const atom = tuple[0]
      if (atom.hydrated !== hydratedSymbol) {
        tuplesToRestore.push(tuple)
        atom.hydrated = hydratedSymbol
      }
    }
    restoreAtoms(tuplesToRestore)
  }, [values, restoreAtoms])
}

const hydratedSymbol = Symbol()

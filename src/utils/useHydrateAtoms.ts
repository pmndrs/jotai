import { useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import type { ScopeContainer } from '../core/contexts'

const hydratedMap: WeakMap<
  ScopeContainer,
  WeakSet<Atom<unknown>>
> = new WeakMap()

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown>, unknown]>,
  scope?: Scope
) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const restoreAtoms = scopeContainer[3]

  const hydratedSet = getHydratedSet(scopeContainer)
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

function getHydratedSet(scopeContainer: ScopeContainer) {
  let hydratedSet = hydratedMap.get(scopeContainer)
  if (!hydratedSet) {
    hydratedSet = new WeakSet()
    hydratedMap.set(scopeContainer, hydratedSet)
  }
  return hydratedSet
}

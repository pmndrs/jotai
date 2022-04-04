import { useDebugValue, useEffect, useState } from 'react'
import type { Atom } from './atom'
import type { ScopeContainer } from './contexts'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from './store'
import type { AtomState, Store } from './store'

const atomToPrintable = (atom: Atom<unknown>) =>
  atom.debugLabel || atom.toString()

const stateToPrintable = ([store, atoms]: [Store, Atom<unknown>[]]) =>
  Object.fromEntries(
    atoms.flatMap((atom) => {
      const mounted = store[DEV_GET_MOUNTED]?.(atom)
      if (!mounted) {
        return []
      }
      const dependents = mounted.t
      const atomState = store[DEV_GET_ATOM_STATE]?.(atom) || ({} as AtomState)
      return [
        [
          atomToPrintable(atom),
          {
            ...('e' in atomState && { error: atomState.e }),
            ...('p' in atomState && { promise: atomState.p }),
            ...('v' in atomState && { value: atomState.v }),
            dependents: Array.from(dependents).map(atomToPrintable),
          },
        ],
      ]
    })
  )

// We keep a reference to the atoms in Provider's registeredAtoms in dev mode,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
export const useDebugState = (scopeContainer: ScopeContainer) => {
  const { s: store } = scopeContainer
  const [atoms, setAtoms] = useState<Atom<unknown>[]>([])
  useEffect(() => {
    const callback = () => {
      setAtoms(Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || []))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [store])
  useDebugValue([store, atoms], stateToPrintable)
}

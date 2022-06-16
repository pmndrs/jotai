import { useContext, useDebugValue, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom, Scope } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
} from '../core/store'
import type { AtomState, Store } from '../core/store'

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

interface Options {
  scope?: Scope
  enabled?: boolean
}

// We keep a reference to the atoms,
// so atoms aren't garbage collected by the WeakMap of mounted atoms
export const useAtomsDebugValue = (options?: Options) => {
  const enabled = options?.enabled ?? __DEV__
  const ScopeContext = getScopeContext(options?.scope)
  const { s: store } = useContext(ScopeContext)
  const [atoms, setAtoms] = useState<Atom<unknown>[]>([])
  useEffect(() => {
    if (!enabled) {
      return
    }
    const callback = () => {
      setAtoms(Array.from(store[DEV_GET_MOUNTED_ATOMS]?.() || []))
    }
    const unsubscribe = store[DEV_SUBSCRIBE_STATE]?.(callback)
    callback()
    return unsubscribe
  }, [enabled, store])
  useDebugValue([store, atoms], stateToPrintable)
}

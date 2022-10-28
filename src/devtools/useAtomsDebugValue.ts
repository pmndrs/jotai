import { useContext, useDebugValue, useEffect, useState } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { Atom } from '../core/atom'
import {
  DEV_GET_ATOM_STATE,
  DEV_GET_MOUNTED,
  DEV_GET_MOUNTED_ATOMS,
  DEV_SUBSCRIBE_STATE,
  FULFILLED,
  PENDING,
  REJECTED,
} from '../core/store'
import type { AtomState, Store } from '../core/store'

type Scope = NonNullable<Parameters<typeof getScopeContext>[0]>

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
            ...(atomState.status === REJECTED && { error: atomState.reason }),
            ...(atomState.status === PENDING && {
              promise: new Promise(atomState.then),
            }),
            ...(atomState.status === FULFILLED && { value: atomState.value }),
            dependents: Array.from(dependents).map(atomToPrintable),
          },
        ],
      ]
    })
  )

type Options = {
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

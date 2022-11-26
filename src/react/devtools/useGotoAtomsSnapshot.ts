import { useCallback } from 'react'
import { useStore } from 'jotai/react'
import type { Atom } from 'jotai/vanilla'

type Options = Parameters<typeof useStore>[0]
type AnyAtomValue = unknown
type AnyAtom = Atom<AnyAtomValue>
type AtomsValues = Map<AnyAtom, AnyAtomValue> // immutable
type AtomsDependents = Map<AnyAtom, Set<AnyAtom>> // immutable
type AtomsSnapshot = Readonly<{
  values: AtomsValues
  dependents: AtomsDependents
}>

export function useGotoAtomsSnapshot(options?: Options) {
  const store = useStore(options)
  return useCallback(
    (snapshot: AtomsSnapshot) => {
      if (store.dev_subscribe_state) {
        store.res(snapshot.values)
      }
    },
    [store]
  )
}

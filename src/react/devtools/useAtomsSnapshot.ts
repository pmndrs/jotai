import { useEffect, useState } from 'react'
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

const isEqualAtomsValues = (left: AtomsValues, right: AtomsValues) =>
  left.size === right.size &&
  Array.from(left).every(([left, v]) => Object.is(right.get(left), v))

const isEqualAtomsDependents = (
  left: AtomsDependents,
  right: AtomsDependents
) =>
  left.size === right.size &&
  Array.from(left).every(([a, dLeft]) => {
    const dRight = right.get(a)
    return (
      dRight &&
      dLeft.size === dRight.size &&
      Array.from(dLeft).every((d) => dRight.has(d))
    )
  })

export function useAtomsSnapshot(options?: Options): AtomsSnapshot {
  const store = useStore(options)

  const [atomsSnapshot, setAtomsSnapshot] = useState<AtomsSnapshot>(() => ({
    values: new Map(),
    dependents: new Map(),
  }))

  useEffect(() => {
    if (!store.dev_subscribe_state) return

    let prevValues: AtomsValues = new Map()
    let prevDependents: AtomsDependents = new Map()
    const callback = () => {
      const values: AtomsValues = new Map()
      const dependents: AtomsDependents = new Map()
      for (const atom of store.dev_get_mounted_atoms() || []) {
        const atomState = store.dev_get_atom_state(atom)
        if (atomState) {
          if ('v' in atomState) {
            values.set(atom, atomState.v)
          }
        }
        const mounted = store.dev_get_mounted(atom)
        if (mounted) {
          dependents.set(atom, mounted.t)
        }
      }
      if (
        isEqualAtomsValues(prevValues, values) &&
        isEqualAtomsDependents(prevDependents, dependents)
      ) {
        // not changed
        return
      }
      prevValues = values
      prevDependents = dependents
      setAtomsSnapshot({ values, dependents })
    }
    const unsubscribe = store.dev_subscribe_state(callback)
    callback()
    return unsubscribe
  }, [store])

  return atomsSnapshot
}

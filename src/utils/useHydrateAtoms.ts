import { useRef } from 'react'
import type { Atom } from '../core/atom'

export function useHydrateAtoms(
  values: Iterable<readonly [Atom<unknown> & { init?: unknown }, unknown]>
) {
  const hasRestoredRef = useRef(false)

  if (!hasRestoredRef.current) {
    hasRestoredRef.current = true
    for (const [atom, value] of values) {
      if ('init' in atom) {
        atom.init = value
      }
    }
  }
}

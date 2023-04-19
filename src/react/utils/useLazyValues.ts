import { useCallback } from 'react'
import type { Atom } from '../../vanilla.ts'
import { useAtomCallback } from './useAtomCallback.ts'

export function useLazyValues<D>(atom: Atom<D>) {
  return useAtomCallback(
    useCallback(
      (get) => {
        return get(atom)
      },
      [atom]
    )
  )
}

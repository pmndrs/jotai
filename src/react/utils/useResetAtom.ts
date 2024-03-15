import { useCallback } from 'react'
import { useSetAtom } from '../../react.ts'
import { RESET } from '../../vanilla/utils.ts'
import type { WritableAtom } from '../../vanilla.ts'

type Options = Parameters<typeof useSetAtom>[1]

export function useResetAtom<T>(
  anAtom: WritableAtom<unknown, [typeof RESET], T>,
  options?: Options,
): () => T {
  const setAtom = useSetAtom(anAtom, options)
  const resetAtom = useCallback(() => setAtom(RESET), [setAtom])
  return resetAtom
}

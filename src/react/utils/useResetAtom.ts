import { useCallback } from 'react'
import { useSetAtom } from 'jotai/react'
import type { WritableAtom } from 'jotai/vanilla'
import { RESET } from 'jotai/vanilla/utils'

type Options = Parameters<typeof useSetAtom>[1]

export function useResetAtom(
  anAtom: WritableAtom<unknown, [typeof RESET], unknown>,
  options?: Options
) {
  const setAtom = useSetAtom(anAtom, options)
  const resetAtom = useCallback(() => setAtom(RESET), [setAtom])
  return resetAtom
}

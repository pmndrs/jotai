'use client'

import { useCallback } from 'react'
import { useSetAtom } from '../../react.js'
import { RESET } from '../../vanilla/utils.js'
import type { WritableAtom } from '../../vanilla.js'

type Options = Parameters<typeof useSetAtom>[1]

export function useResetAtom<T>(
  anAtom: WritableAtom<unknown, [typeof RESET], T>,
  options?: Options,
): () => T {
  const setAtom = useSetAtom(anAtom, options)
  const resetAtom = useCallback(() => setAtom(RESET), [setAtom])
  return resetAtom
}

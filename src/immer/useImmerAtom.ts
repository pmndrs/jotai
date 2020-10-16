/* eslint-disable import/named */
import { useCallback } from 'react'
import { produce, Draft } from 'immer'
import { WritableAtom, useAtom } from 'jotai'

export function useImmerAtom<Value, Update>(
  anAtom: WritableAtom<Value, Update>
): [Value, (fn: (draft: Draft<Value>) => void) => void] {
  const [state, setState] = useAtom<Value, any>(anAtom)
  const setStateWithImmer = useCallback(
    (fn) => {
      setState(produce((draft) => fn(draft)))
    },
    [setState]
  )
  return [state, setStateWithImmer]
}

/* eslint-disable import/named */
import { useCallback } from 'react'
import { Draft, produce } from 'immer'
import { WritableAtom, useAtom } from 'jotai'

export function useImmerAtom<Value>(
  anAtom: WritableAtom<Value, (draft: Draft<Value>) => void>
): [Value, (fn: (draft: Draft<Value>) => void) => void]

export function useImmerAtom<Value>(
  anAtom: WritableAtom<Value, (value: Value) => Value>
): [Value, (fn: (draft: Draft<Value>) => void) => void]

export function useImmerAtom<Value>(
  anAtom: WritableAtom<Value, (value: Value) => Value>
) {
  const [state, setState] = useAtom(anAtom)
  const setStateWithImmer = useCallback(
    (fn) => {
      setState(produce((draft) => fn(draft)) as (value: Value) => Value)
    },
    [setState]
  )
  return [state, setStateWithImmer]
}

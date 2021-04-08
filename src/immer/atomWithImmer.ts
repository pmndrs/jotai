/* eslint-disable import/named */
import { produce, Draft } from 'immer'
import { atom, WritableAtom } from 'jotai'

import type { NonFunction } from '../core/types'

export function atomWithImmer<Value>(
  initialValue: NonFunction<Value>
): WritableAtom<Value, (draft: Draft<Value>) => void> {
  const anAtom: any = atom(
    initialValue,
    (get, set, fn: (draft: Draft<Value>) => void) =>
      set(
        anAtom,
        produce(get(anAtom), (draft: Draft<Value>) => fn(draft))
      )
  )
  return anAtom
}

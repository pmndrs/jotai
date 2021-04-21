/* eslint-disable import/named */
import { produce, Draft } from 'immer'
import { atom, WritableAtom } from 'jotai'

export function atomWithImmer<Value>(
  initialValue: Value
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

/* eslint-disable import/named */
import { produce, Draft } from 'immer'
import { atom, WritableAtom } from 'jotai'

export const atomWithImmer = <Value>(initialValue: Value) => {
  const anAtom: WritableAtom<
    Value,
    Function | ((draft: Draft<Value>) => void)
  > = atom(initialValue, (get, set, fn) =>
    set(anAtom, produce(get(anAtom), (draft) => fn(draft)) as Function)
  )
  return anAtom as WritableAtom<Value, (draft: Draft<Value>) => void>
}

/* eslint-disable import/named */
import { produce, Draft } from 'immer'
import { atom, WritableAtom } from 'jotai'

export const withImmer = <Value, Update>(anAtom: WritableAtom<Value, Update>) =>
  atom(
    (get) => get(anAtom),
    (get, set, fn: (draft: Draft<Value>) => void) =>
      set(
        anAtom,
        (produce(get(anAtom), (draft) => fn(draft)) as unknown) as Update
      )
  )

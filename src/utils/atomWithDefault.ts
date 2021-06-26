import { atom } from 'jotai'
import type { Atom, WritableAtom, SetStateAction } from 'jotai'

import { RESET } from './constants'

type Read<Value> = Atom<Value>['read']

export function atomWithDefault<Value>(getDefault: Read<Value>) {
  type Update = SetStateAction<Value> | typeof RESET
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)
  const anAtom: WritableAtom<Value, Update> = atom(
    (get) => {
      const overwritten = get(overwrittenAtom)
      if (overwritten !== EMPTY) {
        return overwritten
      }
      return getDefault(get)
    },
    (get, set, update) => {
      if (update === RESET) {
        set(overwrittenAtom, EMPTY)
      } else {
        set(
          overwrittenAtom,
          typeof update === 'function'
            ? (update as (prev: Value) => Value)(get(anAtom))
            : update
        )
      }
    }
  )
  return anAtom
}

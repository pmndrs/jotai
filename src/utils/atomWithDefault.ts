import { atom } from 'jotai'
import type { Atom, WritableAtom, SetStateAction } from 'jotai'

type Read<Value> = Atom<Value>['read']

export const REFRESH = Symbol()

export function atomWithDefault<Value>(getDefault: Read<Value>) {
  type Update = SetStateAction<Value> | typeof REFRESH
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
      if (update === REFRESH) {
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

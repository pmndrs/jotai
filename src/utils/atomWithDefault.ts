import { atom } from 'jotai'
import type { Atom, PrimitiveAtom } from 'jotai'

type Read<Value> = Atom<Value>['read']

export function atomWithDefault<Value>(
  getDefault: Read<Value>
): PrimitiveAtom<Value> {
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)
  const anAtom: PrimitiveAtom<Value> = atom(
    (get) => {
      const overwritten = get(overwrittenAtom)
      if (overwritten !== EMPTY) {
        return overwritten
      }
      return getDefault(get)
    },
    (get, set, update) =>
      set(
        overwrittenAtom,
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : update
      )
  )
  return anAtom
}

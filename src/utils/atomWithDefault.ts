import { atom, PrimitiveAtom } from 'jotai'
import type { Read } from '../core/typeUtils'

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

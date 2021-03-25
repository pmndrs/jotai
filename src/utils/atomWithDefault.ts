import { atom, PrimitiveAtom } from 'jotai'
import type { Read } from '../core/types'

export function atomWithDefault<Value>(
  getDefault: Read<Value>
): PrimitiveAtom<Value> {
  const overwrittenAtom = atom(false)
  const anAtom: PrimitiveAtom<Value> = atom(
    (get) => {
      if (get(overwrittenAtom)) {
        return get(anAtom)
      }
      return getDefault(get)
    },
    (get, set, update) => {
      set(overwrittenAtom, true)
      set(
        anAtom,
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : update
      )
    }
  )
  return anAtom
}

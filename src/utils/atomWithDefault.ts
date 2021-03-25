import { atom, PrimitiveAtom } from 'jotai'
import type { Read } from '../core/types'

// This depends on some internal undocumented behaviors.
// It's not recommended to use this pattern in application code.
// If one needs something similar in application code,
// the recommendation instead is to use three atoms.
// Refer: https://github.com/pmndrs/jotai/issues/352#issuecomment-797829152

export function atomWithDefault<Value>(
  getDefault: Read<Value>
): PrimitiveAtom<Value> {
  const EMPTY = Symbol()
  const anAtom: any = atom(
    (get) => {
      const current = get(anAtom)
      if (current !== EMPTY) {
        return current
      }
      return getDefault(get)
    },
    (get, set, update) =>
      set(anAtom, typeof update === 'function' ? update(get(anAtom)) : update)
  )
  anAtom.init = EMPTY
  return anAtom
}

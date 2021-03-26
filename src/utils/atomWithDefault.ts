import { atom, PrimitiveAtom } from 'jotai'
import type { Read, Write, WritableAtom } from '../core/types'

export function atomWithDefault<Value>(
  getDefault: Read<Value>
): PrimitiveAtom<Value>

export function atomWithDefault<Value, Update>(
  getDefault: Read<Value>,
  write: Write<Update>
): WritableAtom<Value, Update>

export function atomWithDefault<Value, Update>(
  getDefault: Read<Value>,
  write?: Write<Update>
): WritableAtom<Value, Update> {
  const overwrittenAtom = atom(false)
  const anAtom: any = atom<Value, Update>(
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
        write
          ? write(get, set, update)
          : typeof update === 'function'
          ? update(get(anAtom))
          : update
      )
    }
  )
  return anAtom
}

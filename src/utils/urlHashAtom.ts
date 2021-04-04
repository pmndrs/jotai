import { atom, PrimitiveAtom } from 'jotai'

import type { SetStateAction } from '../core/types'

export function urlHashAtom<Value>(
  key: string,
  anAtom: PrimitiveAtom<Value>,
  serialize: (val: Value) => string = JSON.stringify,
  deserialize: (str: string) => Value = JSON.parse
): PrimitiveAtom<Value> {
  const derivedAtom = atom(
    (get) => get(anAtom),
    (get, set, update: SetStateAction<Value>) => {
      set(anAtom, update)
      const searchParams = new URLSearchParams(location.hash.slice(1))
      searchParams.set(key, serialize(get(anAtom)))
    }
  )
  derivedAtom.onMount = (setAtom) => {
    const searchParams = new URLSearchParams(location.hash.slice(1))
    const str = searchParams.get(key)
    if (str) {
      setAtom(deserialize(str))
    }
  }
  derivedAtom.scope = anAtom.scope
  return derivedAtom
}

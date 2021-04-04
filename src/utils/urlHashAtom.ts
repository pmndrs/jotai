import { atom, WritableAtom } from 'jotai'

export function urlHashAtom<Value>(
  key: string,
  anAtom: WritableAtom<Value, Value>,
  serialize: (val: Value) => string = JSON.stringify,
  deserialize: (str: string) => Value = JSON.parse
): WritableAtom<Value, Value> {
  const derivedAtom = atom(
    (get) => get(anAtom),
    (_get, set, newValue: Value) => {
      set(anAtom, newValue)
      const searchParams = new URLSearchParams(location.hash.slice(1))
      searchParams.set(key, serialize(newValue))
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

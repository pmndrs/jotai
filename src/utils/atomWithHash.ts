import { atom, PrimitiveAtom } from 'jotai'

export function atomWithHash<Value>(
  key: string,
  initialValue: Value,
  serialize: (val: Value) => string = JSON.stringify,
  deserialize: (str: string) => Value = JSON.parse
): PrimitiveAtom<Value> {
  const anAtom: PrimitiveAtom<Value> = atom(
    initialValue as any,
    (get, set, update) => {
      const newValue =
        typeof typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : (update as Value)
      set(anAtom, newValue)
      const searchParams = new URLSearchParams(location.hash.slice(1))
      searchParams.set(key, serialize(newValue))
      location.hash = searchParams.toString()
    }
  )
  anAtom.onMount = (setAtom) => {
    const callback = () => {
      const searchParams = new URLSearchParams(location.hash.slice(1))
      const str = searchParams.get(key)
      if (str) {
        setAtom(deserialize(str))
      }
    }
    window.addEventListener('hashchange', callback)
    callback()
    return () => {
      window.removeEventListener('hashchange', callback)
    }
  }
  return anAtom
}

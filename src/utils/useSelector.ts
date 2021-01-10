import { useMemo } from 'react'
import { atom, useAtom, Atom } from 'jotai'

export function useSelector<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Slice {
  const sliceAtom = useMemo(() => {
    let initialized = false
    let prevSlice: Slice
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom))
      if (initialized && equalityFn(prevSlice, slice)) {
        return prevSlice
      }
      initialized = true
      prevSlice = slice // self contained mutation?
      return slice
    })
    derivedAtom.scope = anAtom.scope
    return derivedAtom
  }, [anAtom, selector, equalityFn])
  return useAtom(sliceAtom)[0]
}

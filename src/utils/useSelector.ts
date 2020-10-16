import { useMemo } from 'react'
import { atom, useAtom, Atom } from 'jotai'

export function useSelector<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is as any
): Slice {
  const sliceAtom = useMemo(() => {
    let prevSlice: Slice
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom))
      if (equalityFn(prevSlice, slice)) {
        return prevSlice
      }
      prevSlice = slice // self contained mutation?
      return slice
    })
    return derivedAtom
  }, [anAtom, selector, equalityFn])
  return useAtom(sliceAtom)[0]
}

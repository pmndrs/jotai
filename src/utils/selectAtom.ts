import { atom, Atom } from 'jotai'

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  let initialized = false
  let prevSlice: Slice
  const derivedAtom = atom((get) => {
    const slice = selector(get(anAtom))
    if (initialized && equalityFn(prevSlice, slice)) {
      return prevSlice
    }
    initialized = true
    prevSlice = slice
    return slice
  })
  derivedAtom.scope = anAtom.scope
  return derivedAtom
}

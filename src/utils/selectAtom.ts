import { atom, Atom } from 'jotai'

import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const selectAtomCache = new WeakMap()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  const deps: object[] = [anAtom, selector, equalityFn]
  const cachedAtom = getWeakCacheItem(selectAtomCache, deps)
  if (cachedAtom) {
    return cachedAtom as Atom<Slice>
  }
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
  setWeakCacheItem(selectAtomCache, deps, derivedAtom)
  return derivedAtom
}

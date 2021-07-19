import { atom } from 'jotai'
import type { Atom } from 'jotai'
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
  const refAtom = atom(() => ({} as { prev?: Slice }))
  refAtom.scope = anAtom.scope
  const derivedAtom = atom((get) => {
    const slice = selector(get(anAtom))
    const ref = get(refAtom)
    if ('prev' in ref && equalityFn(ref.prev as Slice, slice)) {
      return ref.prev as Slice
    }
    ref.prev = slice
    return slice
  })
  derivedAtom.scope = anAtom.scope
  setWeakCacheItem(selectAtomCache, deps, derivedAtom)
  return derivedAtom
}

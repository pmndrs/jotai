import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

const memoizeAtom = createMemoizeAtom()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  return memoizeAtom(() => {
    // TODO we should revisit this for a better solution than refAtom
    const refAtom = atom(() => ({} as { prev?: Slice }))
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom) as Awaited<Value>)
      const ref = get(refAtom)
      if ('prev' in ref && equalityFn(ref.prev as Slice, slice)) {
        return ref.prev as Slice
      }
      ref.prev = slice
      return slice
    })
    return derivedAtom
  }, [anAtom, selector, equalityFn])
}

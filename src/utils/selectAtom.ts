import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

type ResolveType<T> = T extends Promise<infer V> ? V : T

const memoizeAtom = createMemoizeAtom()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: ResolveType<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  return memoizeAtom(() => {
    const mountedAtom = atom(false)
    mountedAtom.onMount = (set) => {
      set(true)
      return () => set(false)
    }
    const derivedAtom: Atom<Slice> = atom((get) => {
      const slice = selector(get(anAtom) as ResolveType<Value>)
      if (get(mountedAtom)) {
        const prev = get(derivedAtom)
        if (equalityFn(prev, slice)) {
          return prev
        }
      }
      return slice
    })
    return derivedAtom
  }, [anAtom, selector, equalityFn])
}

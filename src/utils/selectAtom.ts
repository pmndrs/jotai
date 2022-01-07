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
    const EMPTY = Symbol()
    const derivedAtom: Atom<Slice | typeof EMPTY> & { init?: typeof EMPTY } =
      atom((get) => {
        const slice = selector(get(anAtom) as ResolveType<Value>)
        const prev = get(derivedAtom)
        if (prev !== EMPTY && equalityFn(prev, slice)) {
          return prev
        }
        return slice
      })
    // Note: This is not a public API. It's not a recommended pattern in application code.
    derivedAtom.init = EMPTY
    return derivedAtom as Atom<Slice>
  }, [anAtom, selector, equalityFn])
}

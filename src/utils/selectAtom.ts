import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

type Awaited<T> = T extends Promise<infer V> ? Awaited<V> : T

type AtomWithPrev<Value, Prev = Value> = Atom<Value> & { prev?: Prev }

const memoizeAtom = createMemoizeAtom()

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
): Atom<Slice> {
  return memoizeAtom(() => {
    const derivedAtom = atom((get) => {
      const slice = selector(get(anAtom) as Awaited<Value>)
      const ref = derivedAtom as AtomWithPrev<Slice>
      if ('prev' in ref && equalityFn(ref.prev as Slice, slice)) {
        return ref.prev as Slice
      }
      ref.prev = slice
      return slice
    })
    return derivedAtom
  }, [anAtom, selector, equalityFn])
}

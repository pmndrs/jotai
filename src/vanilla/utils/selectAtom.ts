import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo3 = <T>(
  create: () => T,
  dep1: object,
  dep2: object,
  dep3: object
): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  const cache3 = getCached(() => new WeakMap(), cache2, dep2)
  return getCached(create, cache3, dep3)
}

export function selectAtom<Value, Slice>(
  anAtom: Atom<Promise<Value>>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn?: (a: Slice, b: Slice) => boolean
): Atom<Promise<Slice>>

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn?: (a: Slice, b: Slice) => boolean
): Atom<Slice>

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is
) {
  return memo3(
    () => {
      // TODO we should revisit this for a better solution than refAtom
      const refAtom = atom(() => ({} as { prev?: Slice }))
      const derivedAtom = atom((get) => {
        const ref = get(refAtom)
        const selectValue = (value: Awaited<Value>) => {
          const slice = selector(value)
          if ('prev' in ref && equalityFn(ref.prev as Slice, slice)) {
            return ref.prev as Slice
          }
          return (ref.prev = slice)
        }
        const value = get(anAtom)
        if (value instanceof Promise) {
          return value.then(selectValue)
        }
        return selectValue(value as Awaited<Value>)
      })
      return derivedAtom
    },
    anAtom,
    selector,
    equalityFn
  )
}

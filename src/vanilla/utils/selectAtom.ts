import {
  unstable_NoAtomInitError as NoAtomInitError,
  atom,
} from 'jotai/vanilla'
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
      const EMPTY = Symbol()
      const selectValue = ([value, prevSlice]: readonly [
        Awaited<Value>,
        Slice | typeof EMPTY
      ]) => {
        const slice = selector(value)
        if (prevSlice !== EMPTY && equalityFn(prevSlice, slice)) {
          return prevSlice
        }
        return slice
      }
      const derivedAtom: Atom<Slice | Promise<Slice>> = atom((get) => {
        let prev: Slice | Promise<Slice> | typeof EMPTY = EMPTY
        try {
          prev = get(derivedAtom)
        } catch (e) {
          // we ignore NoAtomInitError intentionally
          if (e !== NoAtomInitError) {
            throw e
          }
        }
        const value = get(anAtom)
        if (value instanceof Promise || prev instanceof Promise) {
          return Promise.all([value, prev] as const).then(selectValue)
        }
        return selectValue([value as Awaited<Value>, prev] as const)
      })
      return derivedAtom
    },
    anAtom,
    selector,
    equalityFn
  )
}

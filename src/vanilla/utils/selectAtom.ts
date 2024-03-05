import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo3 = <T>(
  create: () => T,
  dep1: object,
  dep2: object,
  dep3: object,
): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  const cache3 = getCached(() => new WeakMap(), cache2, dep2)
  return getCached(create, cache3, dep3)
}

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value, prevSlice?: Slice) => Slice,
  equalityFn?: (a: Slice, b: Slice) => boolean,
): Atom<Slice>

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Value, prevSlice?: Slice) => Slice,
  equalityFn: (prevSlice: Slice, slice: Slice) => boolean = Object.is,
) {
  return memo3(
    () => {
      const EMPTY = Symbol()
      const selectValue = ([value, prevSlice]: readonly [
        Value,
        Slice | typeof EMPTY,
      ]) => {
        if (prevSlice === EMPTY) {
          return selector(value)
        }
        const slice = selector(value, prevSlice)
        return equalityFn(prevSlice, slice) ? prevSlice : slice
      }
      const derivedAtom: Atom<Slice | typeof EMPTY> & {
        init?: typeof EMPTY
      } = atom((get) => {
        const prev = get(derivedAtom)
        const value = get(anAtom)
        return selectValue([value, prev] as const)
      })
      // HACK to read derived atom before initialization
      derivedAtom.init = EMPTY
      return derivedAtom
    },
    anAtom,
    selector,
    equalityFn,
  )
}

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
  selector: (v: Awaited<Value>, prevSlice?: Slice) => Slice,
  equalityFn?: (a: Slice, b: Slice) => boolean,
): Atom<Value extends Promise<unknown> ? Promise<Slice> : Slice>

export function selectAtom<Value, Slice>(
  anAtom: Atom<Value>,
  selector: (v: Awaited<Value>, prevSlice?: Slice) => Slice,
  equalityFn: (a: Slice, b: Slice) => boolean = Object.is,
) {
  return memo3(
    () => {
      const EMPTY = Symbol()
      const selectValue = ([value, prevSlice]: readonly [
        Awaited<Value>,
        Slice | typeof EMPTY,
      ]) => {
        if (prevSlice === EMPTY) {
          return selector(value)
        }
        const slice = selector(value, prevSlice)
        return equalityFn(prevSlice, slice) ? prevSlice : slice
      }
      const derivedAtom: Atom<Slice | Promise<Slice> | typeof EMPTY> & {
        init?: typeof EMPTY
      } = atom((get) => {
        const prev = get(derivedAtom)
        const value = get(anAtom)
        if (value instanceof Promise || prev instanceof Promise) {
          return Promise.all([value, prev] as const).then(selectValue)
        }
        return selectValue([value as Awaited<Value>, prev] as const)
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

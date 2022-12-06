import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

export function unwrap<Value>(
  anAtom: Atom<Promise<Value>>,
  defaultValue: Awaited<Value>
): Atom<Awaited<Value>> {
  return memo1(() => {
    // TODO we should revisit this for a better solution than refAtom
    const refAtom = atom(
      () => ({} as { p?: Promise<Value>; v?: Awaited<Value>; e?: unknown })
    )
    const derivedAtom = atom((get, { retry }) => {
      const ref = get(refAtom)
      const promise = get(anAtom)
      if (ref.p !== promise) {
        promise
          .then(
            (v) => (ref.v = v as Awaited<Value>),
            (e) => (ref.e = e)
          )
          .finally(retry)
        ref.p = promise
      }
      if ('e' in ref) {
        throw ref.e
      }
      if ('v' in ref) {
        return ref.v
      }
      return defaultValue
    })
    return derivedAtom
  }, anAtom)
}

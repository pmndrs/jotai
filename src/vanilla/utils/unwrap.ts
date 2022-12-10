import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo2 = <T>(create: () => T, dep1: object, dep2: object): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  return getCached(create, cache2, dep2)
}

const defaultFallback = () => undefined

export function unwrap<Value>(
  anAtom: Atom<Promise<Value>>
): Atom<Awaited<Value> | undefined>

export function unwrap<Value, PendingValue>(
  anAtom: Atom<Promise<Value>>,
  fallback: (prev?: Value) => PendingValue
): Atom<Awaited<Value> | PendingValue>

export function unwrap<Value, PendingValue>(
  anAtom: Atom<Promise<Value>>,
  fallback: (prev?: Value) => PendingValue = defaultFallback as any
): Atom<Awaited<Value> | PendingValue> {
  return memo2(
    () => {
      // TODO we should revisit this for a better solution than refAtom
      const refAtom = atom(
        () => ({} as { p?: Promise<Value>; v?: Awaited<Value>; e?: unknown })
      )
      const refreshAtom = atom(0)
      const derivedAtom = atom(
        (get, { setSelf }) => {
          get(refreshAtom)
          const ref = get(refAtom)
          const promise = get(anAtom)
          if (ref.p === promise) {
            if ('e' in ref) {
              throw ref.e
            }
            if ('v' in ref) {
              return ref.v
            }
          }
          if (ref.p !== promise) {
            promise
              .then(
                (v) => (ref.v = v as Awaited<Value>),
                (e) => (ref.e = e)
              )
              .finally(setSelf)
            ref.p = promise
          }
          if ('v' in ref) {
            return fallback(ref.v)
          }
          return fallback()
        },
        (_get, set) => {
          set(refreshAtom, (c) => c + 1)
        }
      )
      return atom((get) => get(derivedAtom))
    },
    anAtom,
    fallback
  )
}

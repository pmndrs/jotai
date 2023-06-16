import { atom } from '../../vanilla.ts'
import type { Atom, WritableAtom } from '../../vanilla.ts'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo2 = <T>(create: () => T, dep1: object, dep2: object): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  return getCached(create, cache2, dep2)
}

const defaultFallback = () => undefined

export function unwrap<Value>(
  anAtom: Atom<Value>
): Atom<Awaited<Value> | undefined>

export function unwrap<Value, PendingValue>(
  anAtom: Atom<Value>,
  fallback: (prev?: Awaited<Value>) => PendingValue
): Atom<Awaited<Value> | PendingValue>

export function unwrap<Value, PendingValue>(
  anAtom: Atom<Value>,
  fallback: (prev?: Awaited<Value>) => PendingValue = defaultFallback as any
): Atom<Awaited<Value> | PendingValue> {
  return memo2(
    () => {
      type PromiseAndValue = { readonly p?: Promise<Value> } & (
        | { readonly v: Awaited<Value> }
        | { readonly f: PendingValue }
      )
      const promiseErrorCache = new WeakMap<Promise<Value>, unknown>()
      const promiseResultCache = new WeakMap<Promise<Value>, Awaited<Value>>()
      const refreshAtom = atom(0)

      if (import.meta.env?.MODE !== 'production') {
        refreshAtom.debugPrivate = true
      }

      const promiseAndValueAtom: WritableAtom<PromiseAndValue, [], void> & {
        init?: undefined
      } = atom(
        (get, { setSelf }) => {
          get(refreshAtom)
          const prev = get(promiseAndValueAtom) as PromiseAndValue | undefined
          const promise = get(anAtom)
          if (!(promise instanceof Promise)) {
            return { v: promise as Awaited<Value> }
          }
          if (promise === prev?.p) {
            if (promiseErrorCache.has(promise)) {
              throw promiseErrorCache.get(promise)
            }
            if (promiseResultCache.has(promise)) {
              return {
                p: promise,
                v: promiseResultCache.get(promise) as Awaited<Value>,
              }
            }
          }
          if (promise !== prev?.p) {
            promise
              .then(
                (v) => promiseResultCache.set(promise, v as Awaited<Value>),
                (e) => promiseErrorCache.set(promise, e)
              )
              .finally(setSelf)
          }
          if (prev && 'v' in prev) {
            return { p: promise, f: fallback(prev.v) }
          }
          return { p: promise, f: fallback() }
        },
        (_get, set) => {
          set(refreshAtom, (c) => c + 1)
        }
      )
      // HACK to read PromiseAndValue atom before initialization
      promiseAndValueAtom.init = undefined

      if (import.meta.env?.MODE !== 'production') {
        promiseAndValueAtom.debugPrivate = true
      }

      return atom((get) => {
        const state = get(promiseAndValueAtom)
        if ('v' in state) {
          return state.v
        }
        return state.f
      })
    },
    anAtom,
    fallback
  )
}

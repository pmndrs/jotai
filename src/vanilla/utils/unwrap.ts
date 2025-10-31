import { atom } from '../../vanilla.ts'
import type { Atom, WritableAtom } from '../../vanilla.ts'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo2 = <T>(create: () => T, dep1: object, dep2: object): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  return getCached(create, cache2, dep2)
}

const isPromiseLike = (p: unknown): p is PromiseLike<unknown> =>
  typeof (p as any)?.then === 'function'

const defaultFallback = () => undefined

export function unwrap<Value, Args extends unknown[], Result>(
  anAtom: WritableAtom<Value, Args, Result>,
): WritableAtom<Awaited<Value> | undefined, Args, Result>

export function unwrap<Value, Args extends unknown[], Result, PendingValue>(
  anAtom: WritableAtom<Value, Args, Result>,
  fallback: (prev?: Awaited<Value>) => PendingValue,
): WritableAtom<Awaited<Value> | PendingValue, Args, Result>

export function unwrap<Value>(
  anAtom: Atom<Value>,
): Atom<Awaited<Value> | undefined>

export function unwrap<Value, PendingValue>(
  anAtom: Atom<Value>,
  fallback: (prev?: Awaited<Value>) => PendingValue,
): Atom<Awaited<Value> | PendingValue>

export function unwrap<Value, Args extends unknown[], Result, PendingValue>(
  anAtom: WritableAtom<Value, Args, Result> | Atom<Value>,
  fallback: (prev?: Awaited<Value>) => PendingValue = defaultFallback as never,
) {
  return memo2(
    () => {
      type PromiseAndValue = { readonly p?: PromiseLike<unknown> } & (
        | { readonly v: Awaited<Value> }
        | { readonly f: PendingValue; readonly v?: Awaited<Value> }
      )
      const promiseErrorCache = new WeakMap<PromiseLike<unknown>, unknown>()
      const promiseResultCache = new WeakMap<
        PromiseLike<unknown>,
        Awaited<Value>
      >()
      const refreshAtom = atom([() => {}, 0] as [() => void, number])
      refreshAtom.unstable_onInit = (store) => {
        store.set(refreshAtom, ([, c]) => [
          () => store.set(refreshAtom, ([f, c]) => [f, c + 1]),
          c,
        ])
      }

      if (import.meta.env?.MODE !== 'production') {
        refreshAtom.debugPrivate = true
      }

      const promiseAndValueAtom: Atom<PromiseAndValue> & {
        init?: undefined
      } = atom((get) => {
        const [triggerRefresh] = get(refreshAtom)
        const prev = get(promiseAndValueAtom) as PromiseAndValue | undefined
        const promise = get(anAtom)
        if (!isPromiseLike(promise)) {
          return { v: promise as Awaited<Value> }
        }
        if (promise !== prev?.p) {
          promise.then(
            (v) => {
              promiseResultCache.set(promise, v as Awaited<Value>)
              triggerRefresh()
            },
            (e) => {
              promiseErrorCache.set(promise, e)
              triggerRefresh()
            },
          )
        }
        if (promiseErrorCache.has(promise)) {
          throw promiseErrorCache.get(promise)
        }
        if (promiseResultCache.has(promise)) {
          return {
            p: promise,
            v: promiseResultCache.get(promise) as Awaited<Value>,
          }
        }
        if (prev && 'v' in prev) {
          return { p: promise, f: fallback(prev.v), v: prev.v }
        }
        return { p: promise, f: fallback() }
      })
      // HACK to read PromiseAndValue atom before initialization
      promiseAndValueAtom.init = undefined

      if (import.meta.env?.MODE !== 'production') {
        promiseAndValueAtom.debugPrivate = true
      }

      return atom(
        (get) => {
          const state = get(promiseAndValueAtom)
          if ('f' in state) {
            // is pending
            return state.f
          }
          return state.v
        },
        (_get, set, ...args) =>
          set(anAtom as WritableAtom<Value, unknown[], unknown>, ...args),
      )
    },
    anAtom,
    fallback,
  )
}

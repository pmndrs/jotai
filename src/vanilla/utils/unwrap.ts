import { atom } from '../../vanilla.ts'
import type { Atom, WritableAtom } from '../../vanilla.ts'

const getCached = <T>(c: () => T, m: WeakMap<object, T>, k: object): T =>
  (m.has(k) ? m : m.set(k, c())).get(k) as T
const cache1 = new WeakMap()
const memo2 = <T>(create: () => T, dep1: object, dep2: object): T => {
  const cache2 = getCached(() => new WeakMap(), cache1, dep1)
  return getCached(create, cache2, dep2)
}

const isPromise = <Value>(x: Value): x is Value & Promise<Awaited<Value>> =>
  x instanceof Promise

const defaultFallback = () => undefined

type AnyError = unknown
type AtomState<Value> = { w?: { v: Awaited<Value> } | { e: AnyError } }
type GetAtomState = <Value>(atom: Atom<Value>) => AtomState<Value>
type GetAtomStateRef = { v: GetAtomState }
const getAtomStateAtom = atom(() => ({}) as GetAtomStateRef)
// HACK to access atom state
getAtomStateAtom.unstable_onInit = (store) => {
  store.unstable_derive((...args) => {
    store.get(getAtomStateAtom).value = args[0]
    return args
  })
}
if (import.meta.env?.MODE !== 'production') {
  getAtomStateAtom.debugPrivate = true
}

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

export function unwrap<Value, T extends Atom<Value>, PendingValue>(
  targetAtom: T,
  fallback: (prev?: Awaited<Value>) => PendingValue = defaultFallback as never,
) {
  return memo2(
    () => {
      const promiseErrorCache = new WeakMap<Promise<unknown>, unknown>()
      const promiseResultCache = new WeakMap<Promise<unknown>, Awaited<Value>>()
      const refreshAtom = atom(0)
      type PrevRef = { v: Awaited<Value> | undefined }
      const prevAtom = atom(() => ({}) as PrevRef)
      const stateAtom = atom(
        (get, { setSelf }) => {
          get(refreshAtom)
          const prev = get(prevAtom).v
          const valueOrPromise = get(targetAtom)
          const atomState = get(getAtomStateAtom).v(targetAtom)
          if (!isPromise(valueOrPromise)) {
            return { v: valueOrPromise as Awaited<Value> }
          }
          if (
            !promiseResultCache.has(valueOrPromise) &&
            !promiseErrorCache.has(valueOrPromise)
          ) {
            if (atomState.w) {
              if ('v' in atomState.w) {
                // resolved
                promiseResultCache.set(valueOrPromise, atomState.w.v)
              }
              if ('e' in atomState.w) {
                // rejected
                promiseErrorCache.set(valueOrPromise, atomState.w.e)
              }
            } else {
              // not settled
              valueOrPromise.then(
                (v) => {
                  promiseResultCache.set(valueOrPromise, v)
                  setSelf()
                },
                (e) => {
                  promiseErrorCache.set(valueOrPromise, e)
                  setSelf()
                },
              )
            }
          }
          if (promiseErrorCache.has(valueOrPromise)) {
            // rejected
            throw promiseErrorCache.get(valueOrPromise)
          }
          if (!promiseResultCache.has(valueOrPromise)) {
            // not settled
            return { f: fallback(prev) }
          }
          return { v: promiseResultCache.get(valueOrPromise)! }
        },
        (_, set) => set(refreshAtom, (v) => v + 1),
      )

      if (import.meta.env?.MODE !== 'production') {
        refreshAtom.debugPrivate = true
        prevAtom.debugPrivate = true
        stateAtom.debugPrivate = true
      }

      const descriptors = Object.getOwnPropertyDescriptors(
        targetAtom as Atom<Awaited<Value> | PendingValue>,
      )
      descriptors.read.value = (get) => {
        const state = get(stateAtom)
        return 'v' in state ? (get(prevAtom).v = state.v) : state.f
      }
      if ('write' in targetAtom && typeof targetAtom.write === 'function') {
        descriptors.write!.value = targetAtom.write.bind(targetAtom)
      }
      // avoid reading `init` to preserve lazy initialization
      return Object.create(Object.getPrototypeOf(targetAtom), descriptors)
    },
    targetAtom,
    fallback,
  )
}

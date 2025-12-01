import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

const isPromiseLike = <Value>(p: unknown): p is PromiseLike<Awaited<Value>> =>
  typeof (p as any)?.then === 'function'

export type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Awaited<Value> }

const LOADING: Loadable<unknown> = { state: 'loading' }

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memo1(() => {
    const loadableCache = new WeakMap<
      PromiseLike<Awaited<Value>>,
      Loadable<Value>
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

    const derivedAtom = atom((get) => {
      const [triggerRefresh] = get(refreshAtom)
      let value: Value
      try {
        value = get(anAtom)
      } catch (error) {
        return { state: 'hasError', error } as Loadable<Value>
      }
      if (!isPromiseLike<Value>(value)) {
        return { state: 'hasData', data: value } as Loadable<Value>
      }
      const promise = value
      const cached1 = loadableCache.get(promise)
      if (cached1) {
        return cached1
      }
      promise.then(
        (data) => {
          loadableCache.set(promise, { state: 'hasData', data })
          triggerRefresh()
        },
        (error) => {
          loadableCache.set(promise, { state: 'hasError', error })
          triggerRefresh()
        },
      )

      const cached2 = loadableCache.get(promise)
      if (cached2) {
        return cached2
      }
      loadableCache.set(promise, LOADING as Loadable<Value>)
      return LOADING as Loadable<Value>
    })

    if (import.meta.env?.MODE !== 'production') {
      derivedAtom.debugPrivate = true
    }

    return atom((get) => get(derivedAtom))
  }, anAtom)
}

import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'
import { actOnResolved, isPromiseLike } from './promiseUtils.ts'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

export type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Awaited<Value> }

const LOADING: Loadable<unknown> = { state: 'loading' }

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memo1(() => {
    const loadableCache = new WeakMap<PromiseLike<unknown>, Loadable<Value>>()
    const refreshAtom = atom(0)

    if (import.meta.env?.MODE !== 'production') {
      refreshAtom.debugPrivate = true
    }

    const derivedAtom = atom(
      (get, { setSelf }) => {
        get(refreshAtom)
        let value: Value
        try {
          value = get(anAtom)
        } catch (error) {
          return { state: 'hasError', error } as Loadable<Value>
        }
        if (!isPromiseLike(value)) {
          return { state: 'hasData', data: value } as Loadable<Value>
        }

        const promise = value

        let cached = loadableCache.get(promise)
        if (cached) {
          return cached
        }

        actOnResolved(
          promise,
          // fulfilled
          (data) => loadableCache.set(promise, { state: 'hasData', data }),
          // rejected
          (error) => loadableCache.set(promise, { state: 'hasError', error }),
          // finally
          (sync) => {
            if (!sync) {
              // cannot set self synchronously
              setSelf()
            }
          },
        )

        // might have been resolved synchronously
        cached = loadableCache.get(promise)
        if (cached) {
          return cached
        }

        loadableCache.set(promise, LOADING as Loadable<Value>)
        return LOADING as Loadable<Value>
      },
      (_get, set) => {
        set(refreshAtom, (c) => c + 1)
      },
    )

    if (import.meta.env?.MODE !== 'production') {
      derivedAtom.debugPrivate = true
    }

    return atom((get) => get(derivedAtom))
  }, anAtom)
}

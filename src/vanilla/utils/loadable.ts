import { atom } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'

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
    const loadableCache = new WeakMap<Promise<void>, Loadable<Value>>()
    const refreshAtom = atom(0)
    const derivedAtom = atom(
      (get, { setSelf }) => {
        get(refreshAtom)
        const promise = get(anAtom)
        if (!(promise instanceof Promise)) {
          return { state: 'hasData', data: promise } as Loadable<Value>
        }
        const cached = loadableCache.get(promise)
        if (cached) {
          return cached
        }
        loadableCache.set(promise, LOADING as Loadable<Value>)
        promise
          .then(
            (data) => {
              loadableCache.set(promise, { state: 'hasData', data })
            },
            (error) => {
              loadableCache.set(promise, { state: 'hasError', error })
            }
          )
          .finally(setSelf)
        return LOADING as Loadable<Value>
      },
      (_get, set) => {
        set(refreshAtom, (c) => c + 1)
      }
    )
    return atom((get) => get(derivedAtom))
  }, anAtom)
}

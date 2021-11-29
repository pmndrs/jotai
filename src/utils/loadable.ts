import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

type ResolveType<T> = T extends Promise<infer V> ? V : T

const memoizeAtom = createMemoizeAtom()

type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: ResolveType<Value> }

const LOADING: Loadable<unknown> = { state: 'loading' }

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memoizeAtom(() => {
    const loadableAtomCache = new WeakMap<
      Promise<void>,
      Atom<Loadable<Value>>
    >()

    const catchAtom = atom((get) => {
      let promise: Promise<void>
      try {
        const data = get(anAtom) as ResolveType<Value>
        const loadableAtom = atom({ state: 'hasData', data } as Loadable<Value>)
        return loadableAtom
      } catch (error) {
        if (error instanceof Promise) {
          promise = error
        } else {
          const loadableAtom = atom({
            state: 'hasError',
            error,
          } as Loadable<Value>)
          return loadableAtom
        }
      }
      const cached = loadableAtomCache.get(promise)
      if (cached) {
        return cached
      }
      const loadableAtom = atom(
        LOADING as Loadable<Value>,
        async (get, set) => {
          try {
            // NOTE using unstable_promise
            const data: Value = await get(anAtom, true)
            set(loadableAtom, { state: 'hasData', data })
          } catch (error) {
            set(loadableAtom, { state: 'hasError', error })
          }
        }
      )
      loadableAtom.onMount = (init) => {
        init()
      }
      loadableAtomCache.set(promise, loadableAtom)
      return loadableAtom
    })

    const derivedAtom = atom((get) => {
      const loadableAtom = get(catchAtom)
      return get(loadableAtom)
    })

    return derivedAtom
  }, [anAtom])
}

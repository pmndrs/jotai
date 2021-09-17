import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

const memoizeAtom = createMemoizeAtom()

const errorLoadableCache = new WeakMap<object, Loadable<never>>()

type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Value }

const LOADING_LOADABLE: Loadable<never> = { state: 'loading' }

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memoizeAtom(() => {
    const derivedAtom = atom((get): Loadable<Value> => {
      try {
        const value = get(anAtom)

        return {
          state: 'hasData',
          data: value,
        }
      } catch (error) {
        if (error instanceof Promise) {
          return LOADING_LOADABLE
        }

        const cachedErrorLoadable = errorLoadableCache.get(error as Error)

        if (cachedErrorLoadable) {
          return cachedErrorLoadable
        }

        const errorLoadable: Loadable<never> = {
          state: 'hasError',
          error,
        }

        errorLoadableCache.set(error as Error, errorLoadable)
        return errorLoadable
      }
    })

    return derivedAtom
  }, [anAtom])
}

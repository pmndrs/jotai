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
    const refAtom = atom(
      () =>
        ({} as {
          err: unknown
          obj: object
        })
    )
    const derivedAtom = atom((get): Loadable<Value> => {
      const ref = get(refAtom)
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

        let errorObject: object
        if (typeof error === 'object') {
          errorObject = error as object
        } else if (ref.err === error) {
          errorObject = ref.obj
        } else {
          errorObject = new Error(error as string)
          ref.err = error
          ref.obj = errorObject
        }
        const cachedErrorLoadable = errorLoadableCache.get(errorObject)

        if (cachedErrorLoadable) {
          return cachedErrorLoadable
        }

        const errorLoadable: Loadable<never> = {
          state: 'hasError',
          error,
        }

        errorLoadableCache.set(errorObject, errorLoadable)
        return errorLoadable
      }
    })

    return derivedAtom
  }, [anAtom])
}

import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

const memoizeAtom = createMemoizeAtom()

type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Value }

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memoizeAtom(() => {
    // TODO we should revisit this for a better solution than refAtom
    const refAtom = atom(() => ({} as { prev?: Loadable<Value> }))

    const derivedAtom = atom((get): Loadable<Value> => {
      const ref = get(refAtom)
      let curr = ref.prev
      try {
        const value = get(anAtom)
        if (curr?.state !== 'hasData' || !Object.is(curr.data, value)) {
          curr = { state: 'hasData', data: value }
        }
      } catch (error) {
        if (error instanceof Promise) {
          if (curr?.state !== 'loading') {
            curr = { state: 'loading' }
          }
        } else {
          if (curr?.state !== 'hasError' || !Object.is(curr.error, error)) {
            curr = { state: 'hasError', error }
          }
        }
      }
      ref.prev = curr
      return curr as Loadable<Value>
    })

    return derivedAtom
  }, [anAtom])
}

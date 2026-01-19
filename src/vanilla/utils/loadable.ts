import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'
import { unwrap } from './unwrap.ts'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

export type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Awaited<Value> }

let didWarnDeprecation = false

/**
 * @deprecated `loadable` is deprecated infavor of `unwrap`.
 *
 * Userland implementation of loadable:
 * ```js
 * function loadable(anAtom) {
 *   const LOADING = { state: 'loading' }
 *   const unwrappedAtom = unwrap(anAtom, () => LOADING)
 *   return atom((get) => {
 *     try {
 *       const data = get(unwrappedAtom)
 *       if (data === LOADING) {
 *         return LOADING
 *       }
 *       return { state: 'hasData', data }
 *     } catch (error) {
 *       return { state: 'hasError', error }
 *     }
 *   })
 * }
 * ```
 */
export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  if (import.meta.env?.MODE !== 'production' && !didWarnDeprecation) {
    console.warn(
      '[DEPRECATED] loadable is deprecated and will be removed in v3. ' +
        'Please use a userland util with the `unwrap` util: https://github.com/pmndrs/jotai/pull/3217',
    )
    didWarnDeprecation = true
  }
  return memo1(() => {
    const LOADING: Loadable<Value> = { state: 'loading' }
    const unwrappedAtom = unwrap(anAtom, () => LOADING)
    return atom((get) => {
      try {
        const data = get(unwrappedAtom)
        if (data === LOADING) {
          return LOADING
        }
        return { state: 'hasData', data } as Loadable<Value>
      } catch (error) {
        return { state: 'hasError', error }
      }
    })
  }, anAtom)
}

import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'
// XXX We don't usually depend on another util,
// but our future plan is to deprecate loadable in favor of unwrap.
import { unwrap } from './unwrap.ts'

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
    const PENDING = Symbol()
    const unwrappedAtom = unwrap(anAtom, () => PENDING)
    return atom((get) => {
      try {
        const value = get(unwrappedAtom)
        if (value === PENDING) {
          return LOADING as Loadable<Value>
        }
        return { state: 'hasData', data: value as Awaited<Value> }
      } catch (e) {
        return { state: 'hasError', error: e }
      }
    })
  }, anAtom)
}

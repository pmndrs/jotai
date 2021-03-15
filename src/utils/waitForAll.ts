import { Atom } from '../index'
import type { Getter } from '../core/types'

export function waitForAll<Values extends unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
) {
  return (get: Getter) => {
    const promises: Promise<unknown>[] = []
    const values = atoms.map((anAtom) => {
      try {
        return get(anAtom)
      } catch (e) {
        if (e instanceof Promise) {
          promises.push(e)
          return undefined
        }
        throw e
      }
    })
    if (promises.length) {
      throw Promise.all(promises)
    }
    return values as Values
  }
}

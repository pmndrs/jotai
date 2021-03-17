import { Atom, atom } from 'jotai'

import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const waitForAllCache = new WeakMap()

export function waitForAll<Values extends unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
) {
  const deps: object[] = atoms
  const cachedAtom = getWeakCacheItem(waitForAllCache, deps)
  if (cachedAtom) {
    return cachedAtom as Atom<Values>
  }
  const derivedAtom = atom((get) => {
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
  })
  setWeakCacheItem(waitForAllCache, deps, derivedAtom)
  return derivedAtom
}

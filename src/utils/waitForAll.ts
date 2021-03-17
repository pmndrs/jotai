import { Atom, atom } from 'jotai'

import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const waitForAllCache = new WeakMap()

export function waitForAll<Values extends Record<string, Atom<unknown>>>(
  atoms: Values
): Atom<Values>

export function waitForAll<Values extends unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends unknown[]>(
  atoms: WaitForAtoms<Values>
): Atom<Values> | Atom<Record<string, Atom<unknown>>> {
  const unwrappedAtoms = unwrapAtoms(atoms)

  const deps: object[] = unwrappedAtoms
  const cachedAtom = getWeakCacheItem(waitForAllCache, deps)
  if (cachedAtom) {
    return cachedAtom as Atom<Values>
  }
  const derivedAtom = atom((get) => {
    const promises: Promise<unknown>[] = []
    const values = unwrappedAtoms.map((anAtom) => {
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
    return wrapResults(atoms, values) as Values
  })
  setWeakCacheItem(waitForAllCache, deps, derivedAtom)
  return derivedAtom
}

function unwrapAtoms<Values extends unknown[]>(
  atoms: WaitForAtoms<Values>
): Atom<unknown>[] {
  return Array.isArray(atoms)
    ? atoms
    : Object.getOwnPropertyNames(atoms).map(
        (key) => (atoms as Record<string, Atom<unknown>>)[key]
      )
}

function wrapResults<Values extends unknown[]>(
  atoms: WaitForAtoms<Values>,
  results: unknown[]
): Atom<unknown>[] | Record<string, Atom<unknown>> {
  return Array.isArray(atoms)
    ? results
    : Object.getOwnPropertyNames(atoms).reduce(
        (out, key, idx) => ({ ...out, [key]: results[idx] }),
        {}
      )
}

type WaitForAtoms<Values extends unknown[]> =
  | { [K in keyof Values]: Atom<Values[K]> }
  | Record<string, Atom<unknown>>

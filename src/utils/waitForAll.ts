import { Atom, atom } from 'jotai'

import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const waitForAllCache = new WeakMap()

export function waitForAll<Values extends Record<string, unknown>>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends Record<string, unknown> | unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
) {
  const unwrappedAtoms = unwrapAtoms(atoms)
  const cachedAtom = getWeakCacheItem(waitForAllCache, unwrappedAtoms)
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
    return wrapResults(atoms, values)
  })
  setWeakCacheItem(waitForAllCache, unwrappedAtoms, derivedAtom)
  return derivedAtom
}

const unwrapAtoms = <Values extends Record<string, unknown> | unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<unknown>[] =>
  Array.isArray(atoms)
    ? atoms
    : Object.getOwnPropertyNames(atoms).map(
        (key) => (atoms as Record<string, Atom<unknown>>)[key]
      )

const wrapResults = <Values extends Record<string, unknown> | unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> },
  results: unknown[]
): unknown[] | Record<string, unknown> =>
  Array.isArray(atoms)
    ? results
    : Object.getOwnPropertyNames(atoms).reduce(
        (out, key, idx) => ({ ...out, [key]: results[idx] }),
        {}
      )

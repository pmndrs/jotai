import { Atom, atom } from 'jotai'
import type { Scope } from '../core/types'
import { getWeakCacheItem, setWeakCacheItem } from './weakCache'

const waitForAllCache = new WeakMap()

export function waitForAll<Values extends Record<string, unknown>>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends readonly unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<
  Values extends Record<string, unknown> | readonly unknown[]
>(atoms: { [K in keyof Values]: Atom<Values[K]> }) {
  const cachedAtom =
    Array.isArray(atoms) && getWeakCacheItem(waitForAllCache, atoms)
  if (cachedAtom) {
    return cachedAtom as Atom<Values>
  }
  const unwrappedAtoms = unwrapAtoms(atoms)
  const derivedAtom = atom((get) => {
    const promises: Promise<unknown>[] = []
    const values = unwrappedAtoms.map((anAtom, index) => {
      try {
        return get(anAtom)
      } catch (e) {
        if (e instanceof Promise) {
          promises[index] = e
        } else {
          throw e
        }
      }
    })
    if (promises.length) {
      throw Promise.all(promises)
    }
    return wrapResults(atoms, values)
  })

  const waitForAllScope = unwrappedAtoms[0].scope
  derivedAtom.scope = waitForAllScope

  validateAtomScopes(waitForAllScope, unwrappedAtoms)

  if (Array.isArray(atoms)) {
    setWeakCacheItem(waitForAllCache, atoms, derivedAtom)
  }
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

function validateAtomScopes(scope: Scope | undefined, atoms: Atom<unknown>[]) {
  if (scope && !atoms.every((a) => a.scope === scope)) {
    console.warn(
      'Different scopes were found for atoms supplied to waitForAll. This is unsupported and will result in unexpected behavior.'
    )
  }
}

import { Atom, atom } from 'jotai'

export function waitForAll<Values extends Record<string, unknown>>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends readonly unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
): Atom<Values>

export function waitForAll<Values extends Record<string, unknown> | unknown[]>(
  atoms: { [K in keyof Values]: Atom<Values[K]> }
) {
  const derivedAtom = atom((get) => {
    const promises: Promise<unknown>[] = []
    const values = unwrapAtoms(atoms).map((anAtom, index) => {
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
      return Promise.all(promises)
    }
    return wrapResults(atoms, values)
  })
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

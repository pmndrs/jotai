import { atom } from 'jotai'
import type { Atom } from 'jotai'
import { createMemoizeAtom } from './weakCache'

const memoizeAtom = createMemoizeAtom()
const emptyArrayAtom = atom(() => [])

type Awaited<T> = T extends Promise<infer V> ? Awaited<V> : T
type ResolveAtom<T> = T extends Atom<infer V> ? V : T
type AwaitedAtom<T> = Awaited<ResolveAtom<T>>

export function waitForAll<Atoms extends Atom<unknown>[]>(
  atoms: readonly [...Atoms]
): Atom<{
  [K in keyof Atoms]: AwaitedAtom<Atoms[K]>
}>

export function waitForAll<Atoms extends Record<string, Atom<unknown>>>(
  atoms: Atoms
): Atom<{
  [K in keyof Atoms]: AwaitedAtom<Atoms[K]>
}>

export function waitForAll<
  Atoms extends Record<string, Atom<unknown>> | readonly Atom<unknown>[]
>(atoms: Atoms) {
  const createAtom = () => {
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
      return wrapResults(atoms, values) as {
        [K in keyof Atoms]: AwaitedAtom<Atoms[K]>
      }
    })
    return derivedAtom
  }

  if (Array.isArray(atoms)) {
    // if (atoms.length) {
    return memoizeAtom(createAtom, atoms)
    // }
    // return emptyArrayAtom
  }
  return createAtom()
}

const unwrapAtoms = <
  Atoms extends Record<string, Atom<unknown>> | readonly Atom<unknown>[]
>(
  atoms: Atoms
): Atom<unknown>[] =>
  Array.isArray(atoms)
    ? atoms
    : Object.getOwnPropertyNames(atoms).map((key) => atoms[key as keyof Atoms])

const wrapResults = <
  Atoms extends Record<string, Atom<unknown>> | readonly Atom<unknown>[]
>(
  atoms: Atoms,
  results: unknown[]
): unknown[] | Record<string, unknown> =>
  Array.isArray(atoms)
    ? results
    : Object.getOwnPropertyNames(atoms).reduce(
        (out, key, idx) => ({ ...out, [key]: results[idx] }),
        {}
      )

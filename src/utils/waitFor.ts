import { Atom, Getter } from '../core/types'
import { atomFamily } from './atomFamily'

export const waitForAll = atomFamily((atoms: WaitForAtoms) => (get) => {
  const unwrappedAtoms = unwrapAtoms(atoms)
  const [results, exceptions] = concurrentRequests(get, unwrappedAtoms)

  if (exceptions.every((exception) => exception == null)) {
    return wrapResults(atoms, results)
  }

  const error = exceptions.find(
    (exception) => exception != null && !(exception instanceof Promise)
  )

  if (error != null) {
    throw error
  }

  return Promise.all(exceptions).then((exceptionResults) =>
    wrapResults(
      atoms,
      exceptionResults.map((r, index) => {
        r === undefined ? results[index] : r
      })
    )
  )
})

function concurrentRequests(
  get: Getter,
  dependencies: ReadonlyArray<Atom<unknown>>
) {
  const results = Array<unknown | undefined>(dependencies.length).fill(
    undefined
  )
  const exceptions = Array<unknown | undefined>(dependencies.length).fill(
    undefined
  )
  for (const [i, dependency] of dependencies.entries()) {
    try {
      results[i] = get(dependency)
    } catch (e) {
      exceptions[i] = e
    }
  }
  return [results, exceptions]
}

function unwrapAtoms(atoms: WaitForAtoms): ReadonlyArray<Atom<unknown>> {
  return Array.isArray(atoms)
    ? atoms
    : Object.getOwnPropertyNames(atoms).map(
        (key) => (atoms as Record<string, Atom<unknown>>)[key]
      )
}

function wrapResults(
  dependencies: WaitForAtoms,
  results: unknown[]
): unknown[] | Record<string, unknown> {
  return Array.isArray(dependencies)
    ? results
    : Object.getOwnPropertyNames(dependencies).reduce(
        (out, key, idx) => ({ ...out, [key]: results[idx] }),
        {}
      )
}

type WaitForAtoms = ReadonlyArray<Atom<unknown>> | Record<string, Atom<unknown>>

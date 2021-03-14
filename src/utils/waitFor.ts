import { Atom, Getter } from '../core/types'
import { atomFamily } from './atomFamily'

export const waitForAll = atomFamily(
  (dependencies: ReadonlyArray<Atom<unknown>>) => (get) => {
    const [results, exceptions] = concurrentRequests(get, dependencies)

    if (exceptions.every((exception) => exception == null)) {
      return results
    }

    const error = exceptions.find(
      (exception) => exception != null && !(exception instanceof Promise)
    )

    if (error != null) {
      throw error
    }

    return Promise.all(exceptions).then((exceptionResults) =>
      exceptionResults.map((r, index) => {
        r === undefined ? results[index] : r
      })
    )
  }
)

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

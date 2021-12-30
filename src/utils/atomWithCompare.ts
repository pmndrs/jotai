import { atomWithReducer } from './atomWithReducer'

/**
 * Create an atom with a custom comparison function that only triggers updates
 * when `areEqual(prev, next)` is false.
 *
 * Note: Jotai uses `Object.is` internally to compare values when changes occur.
 * If `areEqual(a, b)` returns false, but `Object.is(a, b)` returns true, Jotai
 * will not trigger an update.
 *
 * @param initialValue Initial value.
 * @param areEqual Custom compare function. It should return true if the two values are considered equal.
 * @returns a writable atom.
 */
export function atomWithCompare<Value>(
  initialValue: Value,
  areEqual: (prev: Value, next: Value) => boolean
) {
  return atomWithReducer(initialValue, (prev: Value, next: Value) => {
    if (areEqual(prev, next)) {
      return prev
    }

    // Jotai limitation:
    // areEqual considers values different, but the rest of Jotai considers them the same,
    // so downstream computations will not re-run.
    if (
      typeof process === 'object' &&
      process.env.NODE_ENV !== 'production' &&
      Object.is(prev, next)
    ) {
      console.warn(
        'atomWithCompare: areEqual(',
        prev,
        ', ',
        next,
        ') returned false, but the values are the same. State will not be updated.',
        areEqual
      )
    }

    return next
  })
}

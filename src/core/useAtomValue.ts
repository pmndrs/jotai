import {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useReducer,
} from 'react'
import type { Reducer } from 'react'
import type { Atom, Scope } from './atom'
import { getScopeContext } from './contexts'
import { COMMIT_ATOM, READ_ATOM, SUBSCRIBE_ATOM } from './store'
import type { VersionObject } from './store'

type Awaited<T> =
    T extends null | undefined ? T : // special case for `null | undefined` when not in `--strictNullChecks` mode
        T extends object & { then(onfulfilled: infer F): any } ? // `await` only unwraps object types with a callable `then`. Non-object types are not unwrapped
            F extends ((value: infer V, ...args: any) => any) ? // if the argument to `then` is callable, extracts the first argument
                Awaited<V> : // recursively unwrap the value
                never : // the argument to `then` was not callable
        T; // non-object or non-thenable

export function useAtomValue<Value>(
  atom: Atom<Value>,
  scope?: Scope
): Awaited<Value> {
  const ScopeContext = getScopeContext(scope)
  const { s: store } = useContext(ScopeContext)

  const getAtomValue = useCallback(
    (version?: VersionObject) => {
      // This call to READ_ATOM is the place where derived atoms will actually be
      // recomputed if needed.
      const atomState = store[READ_ATOM](atom, version)
      if ('e' in atomState) {
        throw atomState.e // read error
      }
      if ('p' in atomState) {
        throw atomState.p // read promise
      }
      if ('v' in atomState) {
        return atomState.v as Awaited<Value>
      }
      throw new Error('no atom value')
    },
    [store, atom]
  )

  // Pull the atoms's state from the store into React state.
  const [[version, value, atomFromUseReducer], rerenderIfChanged] = useReducer<
    Reducer<
      readonly [VersionObject | undefined, Awaited<Value>, Atom<Value>],
      VersionObject | undefined
    >,
    undefined
  >(
    useCallback(
      (prev, nextVersion) => {
        const nextValue = getAtomValue(nextVersion)
        if (Object.is(prev[1], nextValue) && prev[2] === atom) {
          return prev // bail out
        }
        return [nextVersion, nextValue, atom]
      },
      [getAtomValue, atom]
    ),
    undefined,
    () => {
      // NOTE should/could branch on mount?
      const initialVersion = undefined
      const initialValue = getAtomValue(initialVersion)
      return [initialVersion, initialValue, atom]
    }
  )

  if (atomFromUseReducer !== atom) {
    rerenderIfChanged(undefined)
  }

  useEffect(() => {
    // Call `rerenderIfChanged` whenever this atom is invalidated. Note
    // that derived atoms may not be recomputed yet.
    const unsubscribe = store[SUBSCRIBE_ATOM](atom, rerenderIfChanged)
    rerenderIfChanged(undefined)
    return unsubscribe
  }, [store, atom])

  useEffect(() => {
    store[COMMIT_ATOM](atom, version)
  })

  useDebugValue(value)
  return value
}

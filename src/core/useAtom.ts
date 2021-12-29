import {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useReducer,
} from 'react'
import type { Reducer } from 'react'
import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import { getScopeContext } from './contexts'
import { COMMIT_ATOM, READ_ATOM, SUBSCRIBE_ATOM, WRITE_ATOM } from './store'
import type { VersionObject } from './store'

type ResolveType<T> = T extends Promise<infer V> ? V : T

const isWritable = <Value, Update, Result extends void | Promise<void>>(
  atom: Atom<Value> | WritableAtom<Value, Update, Result>
): atom is WritableAtom<Value, Update, Result> =>
  !!(atom as WritableAtom<Value, Update, Result>).write

export function useAtom<Value, Update, Result extends void | Promise<void>>(
  atom: WritableAtom<Value, Update, Result>,
  scope?: Scope
): [ResolveType<Value>, SetAtom<Update, Result>]

export function useAtom<Value>(
  atom: Atom<Value>,
  scope?: Scope
): [ResolveType<Value>, never]

export function useAtom<Value, Update, Result extends void | Promise<void>>(
  atom: Atom<Value> | WritableAtom<Value, Update, Result>,
  scope?: Scope
) {
  if ('scope' in atom) {
    console.warn(
      'atom.scope is deprecated. Please do useAtom(atom, scope) instead.'
    )
    scope = (atom as { scope: Scope }).scope
  }

  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)

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
        return atomState.v as ResolveType<Value>
      }
      throw new Error('no atom value')
    },
    [store, atom]
  )

  // This reducer stores this hook's view of the atom's state (prev[1]).
  //
  // We know the component should re-render whenever it's view of the atom changes.
  //
  // If we did change tracking using a previous state stored outside of React,
  // that state could be out of sync with React's concurrent rendering with
  // `useTransition`.
  const [[version, value, atomFromUseReducer], rerenderIfChanged] = useReducer<
    Reducer<
      readonly [VersionObject | undefined, ResolveType<Value>, Atom<Value>],
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
    // Call `rerenderIfAtomStateChanged` whenever this atom is invalidated. Note
    // that derived atoms may not be recomputed yet.
    const unsubscribe = store[SUBSCRIBE_ATOM](atom, rerenderIfChanged)
    rerenderIfChanged(undefined)
    return unsubscribe
  }, [store, atom])

  useEffect(() => {
    store[COMMIT_ATOM](atom, version)
  })

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        const write = (version?: VersionObject) =>
          store[WRITE_ATOM](atom, update, version)
        return versionedWrite ? versionedWrite(write) : write()
      } else {
        throw new Error('not writable atom')
      }
    },
    [store, versionedWrite, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

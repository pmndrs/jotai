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

type ResolveType<T> = T extends Promise<infer V> ? V : T
type VersionObject = object

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
  const { s: store, v: getVersion } = useContext(ScopeContext)

  const getAtomValue = useCallback(
    (version?: VersionObject) => {
      const atomState = store[READ_ATOM](atom, version)
      if ('e' in atomState) {
        throw atomState.e // read error
      }
      if (atomState.p) {
        throw atomState.p // read promise
      }
      if ('v' in atomState) {
        return atomState.v as ResolveType<Value>
      }
      throw new Error('no atom value')
    },
    [store, atom]
  )

  const [[version, value, atomFromUseReducer], dispatch] = useReducer<
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
      // TODO currently, there's no way to get a stable initial version
      const initialVersion = undefined
      const initialValue = getAtomValue(initialVersion)
      return [initialVersion, initialValue, atom]
    }
  )

  if (atomFromUseReducer !== atom) {
    const initialVersion = getVersion()
    dispatch(initialVersion)
  }

  useEffect(() => {
    const callback = () => dispatch(getVersion())
    const unsubscribe = store[SUBSCRIBE_ATOM](atom, callback)
    callback()
    return unsubscribe
  }, [store, getVersion, atom])

  useEffect(() => {
    store[COMMIT_ATOM](atom, version)
  })

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        return store[WRITE_ATOM](atom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [store, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

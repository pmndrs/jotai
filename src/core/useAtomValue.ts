import { useContext, useDebugValue, useEffect, useReducer } from 'react'
import type { Reducer } from 'react'
import type { Atom, Scope } from './atom'
import { getScopeContext } from './contexts'
import { COMMIT_ATOM, READ_ATOM, SUBSCRIBE_ATOM } from './store'
import type { VersionObject } from './store'
import type { ExtractAtomValue } from './typeUtils'

export function useAtomValue<Value>(
  atom: Atom<Value>,
  scope?: Scope
): Awaited<Value>

export function useAtomValue<AtomType extends Atom<any>>(
  atom: AtomType,
  scope?: Scope
): Awaited<ExtractAtomValue<AtomType>>

export function useAtomValue<Value>(atom: Atom<Value>, scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const scopeContainer = useContext(ScopeContext)
  const { s: store, v: versionFromProvider } = scopeContainer

  const getAtomValue = (version?: VersionObject) => {
    // This call to READ_ATOM is the place where derived atoms will actually be
    // recomputed if needed.
    const atomState = store[READ_ATOM](atom, version)
    if (__DEV__ && !atomState.y) {
      throw new Error('should not be invalidated')
    }
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
  }

  // Pull the atoms's state from the store into React state.
  const [[version, valueFromReducer, atomFromReducer], rerenderIfChanged] =
    useReducer<
      Reducer<
        readonly [VersionObject | undefined, Awaited<Value>, Atom<Value>],
        VersionObject | undefined
      >,
      VersionObject | undefined
    >(
      (prev, nextVersion) => {
        const nextValue = getAtomValue(nextVersion)
        if (Object.is(prev[1], nextValue) && prev[2] === atom) {
          return prev // bail out
        }
        return [nextVersion, nextValue, atom]
      },
      versionFromProvider,
      (initialVersion) => {
        const initialValue = getAtomValue(initialVersion)
        return [initialVersion, initialValue, atom]
      }
    )

  let value = valueFromReducer
  if (atomFromReducer !== atom) {
    rerenderIfChanged(version)
    value = getAtomValue(version)
  }

  useEffect(() => {
    const { v: versionFromProvider } = scopeContainer
    if (versionFromProvider) {
      store[COMMIT_ATOM](atom, versionFromProvider)
    }
    // Call `rerenderIfChanged` whenever this atom is invalidated. Note
    // that derived atoms may not be recomputed yet.
    const unsubscribe = store[SUBSCRIBE_ATOM](
      atom,
      rerenderIfChanged,
      versionFromProvider
    )
    rerenderIfChanged(versionFromProvider)
    return unsubscribe
  }, [store, atom, scopeContainer])

  useEffect(() => {
    store[COMMIT_ATOM](atom, version)
  })

  useDebugValue(value)
  return value
}

import { useCallback, useContext, useDebugValue, useEffect } from 'react'
import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import { getScopeContext } from './contexts'
import { useMutableSource } from './useMutableSource'
import { readAtom, subscribeAtom } from './vanilla'
import type { State } from './vanilla'

const isWritable = <Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>
): atom is WritableAtom<Value, Update> =>
  !!(atom as WritableAtom<Value, Update>).write

export function useAtom<Value, Update>(
  atom: WritableAtom<Value | Promise<Value>, Update>,
  scope?: Scope
): [Value, SetAtom<Update>]

export function useAtom<Value, Update>(
  atom: WritableAtom<Promise<Value>, Update>,
  scope?: Scope
): [Value, SetAtom<Update>]

export function useAtom<Value, Update>(
  atom: WritableAtom<Value, Update>,
  scope?: Scope
): [Value, SetAtom<Update>]

export function useAtom<Value>(
  atom: Atom<Value | Promise<Value>>,
  scope?: Scope
): [Value, never]

export function useAtom<Value>(
  atom: Atom<Promise<Value>>,
  scope?: Scope
): [Value, never]

export function useAtom<Value>(atom: Atom<Value>, scope?: Scope): [Value, never]

export function useAtom<Value, Update>(
  atom: Atom<Value> | WritableAtom<Value, Update>,
  scope?: Scope
) {
  const getAtomValue = useCallback(
    (state: State) => {
      const atomState = readAtom(state, atom)
      if (atomState.e) {
        throw atomState.e // read error
      }
      if (atomState.p) {
        throw atomState.p // read promise
      }
      if (atomState.w) {
        throw atomState.w // write promise
      }
      if ('v' in atomState) {
        return atomState.v as Value
      }
      throw new Error('no atom value')
    },
    [atom]
  )

  const subscribe = useCallback(
    (state: State, callback: () => void) =>
      subscribeAtom(state, atom, callback),
    [atom]
  )

  if ('scope' in atom) {
    console.warn(
      'atom.scope is deprecated. Please do useAtom(atom, scope) instead.'
    )
    scope = atom.scope
  }

  const ScopeContext = getScopeContext(scope)
  const [mutableSource, updateAtom, commitCallback] = useContext(ScopeContext)
  const value = useMutableSource(mutableSource, getAtomValue, subscribe)
  useEffect(() => {
    commitCallback()
  })

  const setAtom = useCallback(
    (update: Update) => {
      if (isWritable(atom)) {
        updateAtom(atom, update)
      } else {
        throw new Error('not writable atom')
      }
    },
    [updateAtom, atom]
  )

  useDebugValue(value)
  return [value, setAtom]
}

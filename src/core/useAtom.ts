import {
  useCallback,
  useContext,
  useDebugValue,
  useEffect,
  useState,
} from 'react'
import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import { getScopeContext } from './contexts'
import { FLUSH_PENDING, READ_ATOM, SUBSCRIBE_ATOM, WRITE_ATOM } from './store'

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
  if ('scope' in atom) {
    console.warn(
      'atom.scope is deprecated. Please do useAtom(atom, scope) instead.'
    )
    scope = (atom as { scope: Scope }).scope
  }

  const ScopeContext = getScopeContext(scope)
  const [store] = useContext(ScopeContext)

  const [atomState, setAtomState] = useState(() => store[READ_ATOM](atom))
  if (atomState.e) {
    throw atomState.e // read error
  }
  if (atomState.p) {
    throw atomState.p // read promise
  }
  if (atomState.w) {
    throw atomState.w // write promise
  }
  if (!('v' in atomState)) {
    throw new Error('no atom value')
  }
  const value = atomState.v as Value

  useEffect(() => {
    const callback = () =>
      setAtomState((prevAtomState) => {
        const nextAtomState = store[READ_ATOM](atom)
        if (
          !prevAtomState.e && // no read error
          !prevAtomState.p && // no read promise
          !prevAtomState.w && // no write promise
          'v' in prevAtomState &&
          !nextAtomState.e && // no read error
          !nextAtomState.p && // no read promise
          !nextAtomState.w && // no write promise
          'v' in nextAtomState &&
          Object.is(prevAtomState.v, nextAtomState.v)
        ) {
          // bail out
          return prevAtomState
        }
        return nextAtomState
      })
    const unsubscribe = store[SUBSCRIBE_ATOM](atom, callback)
    callback()
    return unsubscribe
  }, [store, atom])

  useEffect(() => {
    store[FLUSH_PENDING]()
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

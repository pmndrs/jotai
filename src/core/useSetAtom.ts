import { useCallback, useContext } from 'react'
import type { Scope, SetAtom, WritableAtom } from './atom'
import { getScopeContext } from './contexts'
import { WRITE_ATOM } from './store'
import type { VersionObject } from './store'

export function useSetAtom<Value, Update, Result extends void | Promise<void>>(
  atom: WritableAtom<Value, Update, Result>,
  scope?: Scope
): SetAtom<Update, Result> {
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)
  const setAtom = useCallback(
    (update: Update) => {
      if (
        !('write' in atom) &&
        typeof process === 'object' &&
        process.env.NODE_ENV !== 'production'
      ) {
        // useAtom can pass non writable atom with wrong type assertion,
        // so we should check here.
        throw new Error('not writable atom')
      }
      const write = (version?: VersionObject) =>
        store[WRITE_ATOM](atom, update, version)
      return versionedWrite ? versionedWrite(write) : write()
    },
    [store, versionedWrite, atom]
  )
  return setAtom as SetAtom<Update, Result>
}

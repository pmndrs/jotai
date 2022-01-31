import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Atom, Scope, SetAtom } from '../core/atom'
import { WRITE_ATOM } from '../core/store'
import type { VersionObject } from '../core/store'

const isWritable = <Value, Update, Result extends void | Promise<void>>(
  atom: Atom<Value> | WritableAtom<Value, Update, Result>
): atom is WritableAtom<Value, Update, Result> =>
  !!(atom as WritableAtom<Value, Update, Result>).write

export function useSetAtom<Value, Update, Result extends void | Promise<void>>(
  atom: WritableAtom<Value, Update, Result>,
  scope?: Scope
): SetAtom<Update, Result> {
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)
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
  return setAtom as SetAtom<Update, Result>
}

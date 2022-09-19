import { useCallback, useContext } from 'react'
import type { Scope, SetAtom, WritableAtom } from './atom'
import { getScopeContext } from './contexts'
import { WRITE_ATOM } from './store'
import type { VersionObject } from './store'
import type { ExtractAtomResult, ExtractAtomUpdate } from './typeUtils'

export function useSetAtom<
  AtomType extends WritableAtom<any, any, void | Promise<void>>
>(
  atom: AtomType,
  scope?: Scope
): SetAtom<ExtractAtomUpdate<AtomType>, ExtractAtomResult<AtomType>> {
  type Update = ExtractAtomUpdate<AtomType>
  type Result = ExtractAtomResult<AtomType>
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)
  const setAtom = useCallback(
    (update: Update) => {
      if (__DEV__ && !('write' in atom)) {
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

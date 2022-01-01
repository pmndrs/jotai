import { useCallback, useContext } from 'react'
import { SECRET_INTERNAL_getScopeContext as getScopeContext } from 'jotai'
import type { WritableAtom } from 'jotai'
import type { Scope, SetAtom } from '../core/atom'
import { WRITE_ATOM } from '../core/store'
import type { VersionObject } from '../core/store'

export function useUpdateAtom<
  Value,
  Update,
  Result extends void | Promise<void>
>(anAtom: WritableAtom<Value, Update, Result>, scope?: Scope) {
  const ScopeContext = getScopeContext(scope)
  const { s: store, w: versionedWrite } = useContext(ScopeContext)
  const setAtom = useCallback(
    (update: Update) => {
      const write = (version?: VersionObject) =>
        store[WRITE_ATOM](anAtom, update, version)
      return versionedWrite ? versionedWrite(write) : write()
    },
    [store, versionedWrite, anAtom]
  )
  return setAtom as SetAtom<Update, Result>
}

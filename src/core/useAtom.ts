import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import { ResolveType, useAtomValue } from './useAtomValue'
import { useSetAtom } from './useSetAtom'

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
  return [
    useAtomValue(atom, scope),
    useSetAtom(atom as WritableAtom<Value, Update, Result>, scope),
  ]
}

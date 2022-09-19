import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import type {
  ExtractAtomResult,
  ExtractAtomUpdate,
  ExtractAtomValue,
} from './typeUtils'
import { useAtomValue } from './useAtomValue'
import { useSetAtom } from './useSetAtom'

export function useAtom<Value, Update, Result extends void | Promise<void>>(
  atom: WritableAtom<Value, Update, Result>,
  scope?: Scope
): [Awaited<Value>, SetAtom<Update, Result>]

export function useAtom<Value>(
  atom: Atom<Value>,
  scope?: Scope
): [Awaited<Value>, never]

export function useAtom<
  AtomType extends WritableAtom<any, any, void | Promise<void>>
>(
  atom: AtomType,
  scope?: Scope
): [
  Awaited<ExtractAtomValue<AtomType>>,
  SetAtom<ExtractAtomUpdate<AtomType>, ExtractAtomResult<AtomType>>
]

export function useAtom<AtomType extends Atom<any>>(
  atom: AtomType,
  scope?: Scope
): [Awaited<ExtractAtomValue<AtomType>>, never]

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
    // We do wrong type assertion here, which results in throwing an error.
    useSetAtom(atom as WritableAtom<Value, Update, Result>, scope),
  ]
}

import type { Atom, Scope, SetAtom, WritableAtom } from './atom'
import type {
  ExtractAtomResult,
  ExtractAtomUpdate,
  ExtractAtomValue,
} from './typeUtils'
import { useAtomValue } from './useAtomValue'
import { useSetAtom } from './useSetAtom'

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

export function useAtom<
  AtomType extends WritableAtom<unknown, unknown, void | Promise<void>>
>(atom: AtomType, scope?: Scope) {
  if ('scope' in atom) {
    console.warn(
      'atom.scope is deprecated. Please do useAtom(atom, scope) instead.'
    )
    scope = (atom as unknown as { scope: Scope }).scope
  }
  return [useAtomValue(atom, scope), useSetAtom(atom, scope)]
}

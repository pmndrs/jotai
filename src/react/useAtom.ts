import type {
  Atom,
  ExtractAtomArgs,
  ExtractAtomResult,
  ExtractAtomValue,
  WritableAtom,
} from 'jotai/vanilla'
import { useStore } from './Provider'
import { useAtomValue } from './useAtomValue'
import { useSetAtom } from './useSetAtom'

type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result
type Store = ReturnType<typeof useStore>

type Options = {
  store?: Store
}

export function useAtom<AtomType extends WritableAtom<any, any[], any>>(
  atom: AtomType,
  options?: Options
): [
  Awaited<ExtractAtomValue<AtomType>>,
  SetAtom<ExtractAtomArgs<AtomType>, ExtractAtomResult<AtomType>>
]

export function useAtom<AtomType extends Atom<any>>(
  atom: AtomType,
  options?: Options
): [Awaited<ExtractAtomValue<AtomType>>, never]

export function useAtom<AtomType extends Atom<any>>(
  atom: AtomType,
  options?: Options
) {
  return [
    useAtomValue(atom, options),
    // We do wrong type assertion here, which results in throwing an error.
    useSetAtom(atom as any, options),
  ]
}

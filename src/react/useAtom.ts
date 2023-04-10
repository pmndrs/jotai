import type {
  Atom,
  ExtractAtomArgs,
  ExtractAtomResult,
  ExtractAtomValue,
  WritableAtom,
} from '../vanilla.ts'
import { useAtomValue } from './useAtomValue.ts'
import { useSetAtom } from './useSetAtom.ts'

type SetAtom<Args extends any[], Result> = (...args: Args) => Result

type Options = Parameters<typeof useAtomValue>[1]

export function useAtom<Value, Args extends any[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  options?: Options
): [Awaited<Value>, SetAtom<Args, Result>]

export function useAtom<Value>(
  atom: Atom<Value>,
  options?: Options
): [Awaited<Value>, never]

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

export function useAtom<Value, Args extends any[], Result>(
  atom: Atom<Value> | WritableAtom<Value, Args, Result>,
  options?: Options
) {
  return [
    useAtomValue(atom, options),
    // We do wrong type assertion here, which results in throwing an error.
    useSetAtom(atom as WritableAtom<Value, Args, Result>, options),
  ]
}

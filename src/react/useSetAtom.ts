import { useCallback } from 'react'
import type {
  ExtractAtomArgs,
  ExtractAtomResult,
  WritableAtom,
} from '../vanilla.ts'
import { useStore } from './Provider.ts'

type SetAtom<Args extends any[], Result> = (...args: Args) => Result
type Store = ReturnType<typeof useStore>

type Options = {
  store?: Store
}

export function useSetAtom<Value, Args extends any[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  options?: Options,
): SetAtom<Args, Result>

export function useSetAtom<AtomType extends WritableAtom<any, any[], any>>(
  atom: AtomType,
  options?: Options,
): SetAtom<ExtractAtomArgs<AtomType>, ExtractAtomResult<AtomType>>

export function useSetAtom<Value, Args extends any[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  options?: Options,
) {
  const store = useStore(options)
  const setAtom = useCallback(
    (...args: Args) => {
      if (import.meta.env?.MODE !== 'production' && !('write' in atom)) {
        // useAtom can pass non writable atom with wrong type assertion,
        // so we should check here.
        throw new Error('not writable atom')
      }
      return store.set(atom, ...args)
    },
    [store, atom],
  )
  return setAtom
}

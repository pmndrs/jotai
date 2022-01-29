import { useAtom } from 'jotai'
import type { Atom } from 'jotai'
import type { Scope } from '../core/atom'

export function useAtomValue<Value>(anAtom: Atom<Value>, scope?: Scope) {
  return useAtom(anAtom, scope)[0]
}

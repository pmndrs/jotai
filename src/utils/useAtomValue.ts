import { useAtom } from 'jotai'
import type { Atom } from 'jotai'

export function useAtomValue<Value>(anAtom: Atom<Value>) {
  return useAtom(anAtom)[0]
}

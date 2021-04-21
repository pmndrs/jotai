import { Atom, useAtom } from 'jotai'

export function useAtomValue<Value>(anAtom: Atom<Value>) {
  return useAtom(anAtom)[0]
}

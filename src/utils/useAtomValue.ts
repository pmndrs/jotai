import { Atom, useAtom } from 'jotai'

export function useAtomValue<Value>(anAtom: Atom<Value>): Value {
  return useAtom(anAtom)[0]
}

/* eslint-disable import/named */
import { produce, Draft } from 'immer'
import { PrimitiveAtom, WritableAtom, atom } from 'jotai'

export function withImmer<Value>(
  anAtom: PrimitiveAtom<Value>
): WritableAtom<Value, (draft: Draft<Value>) => void>

export function withImmer<Value>(
  anAtom: WritableAtom<Value, Value>
): WritableAtom<Value, (draft: Draft<Value>) => void>

export function withImmer<Value>(anAtom: WritableAtom<Value, Value>) {
  const derivedAtom = atom(
    (get) => get(anAtom),
    (get, set, fn: (draft: Draft<Value>) => void) =>
      set(
        anAtom,
        produce(get(anAtom), (draft) => fn(draft))
      )
  )
  derivedAtom.scope = anAtom.scope
  return derivedAtom
}

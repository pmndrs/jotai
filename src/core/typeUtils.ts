import type { Atom, WritableAtom, PrimitiveAtom } from './atom'

export type ExtractAtomValue<AtomType> = AtomType extends Atom<infer Value>
  ? Value
  : never

export type ExtractAtomUpdate<AtomType> = AtomType extends WritableAtom<
  unknown,
  infer Update
>
  ? Update
  : never

export type SetStateAction<Value> = ExtractAtomUpdate<PrimitiveAtom<Value>>

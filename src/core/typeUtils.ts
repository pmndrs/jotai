import type { Atom, WritableAtom, PrimitiveAtom } from './atom'

export type Read<Value> = Atom<Value>['read']

export type Write<Update> = WritableAtom<unknown, Update>['write']

export type SetStateAction<Value> = PrimitiveAtom<Value> extends WritableAtom<
  Value,
  infer Update
>
  ? Update
  : never

export type ExtractAtomValue<AtomType> = AtomType extends Atom<infer Value>
  ? Value
  : never

import type { Atom, WritableAtom, PrimitiveAtom } from './atom'

export type Getter = Parameters<Atom<unknown>['read']>[0]
export type Setter = Parameters<WritableAtom<unknown, unknown>['write']>[1]

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

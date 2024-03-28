import type { Atom, PrimitiveAtom, WritableAtom } from './atom.ts'

export type Getter = Parameters<Atom<unknown>['read']>[0]
export type Setter = Parameters<
  WritableAtom<unknown, unknown[], unknown>['write']
>[1]

export type ExtractAtomValue<AtomType> =
  AtomType extends Atom<infer Value> ? Value : never

export type ExtractAtomArgs<AtomType> =
  AtomType extends WritableAtom<unknown, infer Args, infer _Result>
    ? Args
    : never

export type ExtractAtomResult<AtomType> =
  AtomType extends WritableAtom<unknown, infer _Args, infer Result>
    ? Result
    : never

export type SetStateAction<Value> = ExtractAtomArgs<PrimitiveAtom<Value>>[0]

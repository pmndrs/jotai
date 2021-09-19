import { Atom, PrimitiveAtom, WritableAtom } from './atom';
export declare type Getter = Parameters<Atom<unknown>['read']>[0];
export declare type Setter = Parameters<WritableAtom<unknown, unknown>['write']>[1];
export declare type ExtractAtomValue<AtomType> = AtomType extends Atom<infer Value> ? Value : never;
export declare type ExtractAtomUpdate<AtomType> = AtomType extends WritableAtom<unknown, infer Update> ? Update : never;
export declare type SetStateAction<Value> = ExtractAtomUpdate<PrimitiveAtom<Value>>;

import type { Atom } from 'jotai';
export declare type WeakCache<T> = WeakMap<object, [WeakCache<T>] | [WeakCache<T>, T]>;
export declare const createMemoizeAtom: () => <AtomType extends Atom<unknown>, Deps extends readonly object[]>(createAtom: () => AtomType, deps: Deps) => AtomType;

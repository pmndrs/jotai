import type { Atom } from 'jotai';
export declare function selectAtom<Value, Slice>(anAtom: Atom<Value>, selector: (v: Value) => Slice, equalityFn?: (a: Slice, b: Slice) => boolean): Atom<Slice>;

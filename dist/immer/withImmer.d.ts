import type { Draft } from 'immer';
import type { PrimitiveAtom, WritableAtom } from 'jotai';
export declare function withImmer<Value>(anAtom: PrimitiveAtom<Value>): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>;
export declare function withImmer<Value>(anAtom: WritableAtom<Value, Value>): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>;

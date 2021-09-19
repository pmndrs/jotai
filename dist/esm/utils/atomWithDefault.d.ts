import type { Atom, WritableAtom } from 'jotai';
import { RESET } from './constants';
declare type Read<Value> = Atom<Value>['read'];
export declare function atomWithDefault<Value>(getDefault: Read<Value>): WritableAtom<Value, typeof RESET | (Value | ((prev: Value) => Value))>;
export {};

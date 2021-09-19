import type { WritableAtom } from 'jotai';
import { RESET } from './constants';
export declare function atomWithReset<Value>(initialValue: Value): WritableAtom<Value, typeof RESET | (Value | ((prev: Value) => Value))>;

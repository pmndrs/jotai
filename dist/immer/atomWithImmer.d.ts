import type { Draft } from 'immer';
import type { WritableAtom } from 'jotai';
export declare function atomWithImmer<Value>(initialValue: Value): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>;

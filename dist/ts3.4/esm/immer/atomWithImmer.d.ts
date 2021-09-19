import { Draft } from 'immer';
import { WritableAtom } from 'jotai';
export declare function atomWithImmer<Value>(initialValue: Value): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>;

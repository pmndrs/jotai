import { Draft } from 'immer';
import { WritableAtom } from 'jotai';
import { Scope } from '../core/atom';
export declare function useImmerAtom<Value>(anAtom: WritableAtom<Value, (draft: Draft<Value>) => void>, scope?: Scope): [
    Value,
    (fn: (draft: Draft<Value>) => void) => void
];
export declare function useImmerAtom<Value>(anAtom: WritableAtom<Value, (value: Value) => Value>, scope?: Scope): [
    Value,
    (fn: (draft: Draft<Value>) => void) => void
];

import type { Draft } from 'immer';
import type { WritableAtom } from 'jotai';
import type { Scope } from '../core/atom';
export declare function useImmerAtom<Value>(anAtom: WritableAtom<Value, (draft: Draft<Value>) => void>, scope?: Scope): [Value, (fn: (draft: Draft<Value>) => void) => void];
export declare function useImmerAtom<Value>(anAtom: WritableAtom<Value, (value: Value) => Value>, scope?: Scope): [Value, (fn: (draft: Draft<Value>) => void) => void];

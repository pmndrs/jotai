import { PrimitiveAtom } from 'jotai';
import { Scope } from '../core/atom';
export declare function useReducerAtom<Value, Action>(anAtom: PrimitiveAtom<Value>, reducer: (v: Value, a?: Action) => Value, scope?: Scope): [
    Value,
    (action?: Action) => void
];
export declare function useReducerAtom<Value, Action>(anAtom: PrimitiveAtom<Value>, reducer: (v: Value, a: Action) => Value, scope?: Scope): [
    Value,
    (action: Action) => void
];

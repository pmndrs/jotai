import { WritableAtom } from 'jotai';
export declare function atomWithReducer<Value, Action>(initialValue: Value, reducer: (v: Value, a?: Action) => Value): WritableAtom<Value, Action | undefined>;
export declare function atomWithReducer<Value, Action>(initialValue: Value, reducer: (v: Value, a: Action) => Value): WritableAtom<Value, Action>;

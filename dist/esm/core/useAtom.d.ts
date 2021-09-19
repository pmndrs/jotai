import type { Atom, Scope, SetAtom, WritableAtom } from './atom';
export declare function useAtom<Value, Update>(atom: WritableAtom<Value | Promise<Value>, Update>, scope?: Scope): [Value, SetAtom<Update>];
export declare function useAtom<Value, Update>(atom: WritableAtom<Promise<Value>, Update>, scope?: Scope): [Value, SetAtom<Update>];
export declare function useAtom<Value, Update>(atom: WritableAtom<Value, Update>, scope?: Scope): [Value, SetAtom<Update>];
export declare function useAtom<Value>(atom: Atom<Value | Promise<Value>>, scope?: Scope): [Value, never];
export declare function useAtom<Value>(atom: Atom<Promise<Value>>, scope?: Scope): [Value, never];
export declare function useAtom<Value>(atom: Atom<Value>, scope?: Scope): [Value, never];

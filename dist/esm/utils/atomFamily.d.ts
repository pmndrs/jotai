import type { Atom, WritableAtom } from 'jotai';
declare type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean;
declare type AtomFamily<Param, AtomType> = {
    (param: Param): AtomType;
    remove(param: Param): void;
    setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void;
};
export declare function atomFamily<Param, Value, Update>(initializeAtom: (param: Param) => WritableAtom<Value, Update>, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, WritableAtom<Value, Update>>;
export declare function atomFamily<Param, Value>(initializeAtom: (param: Param) => Atom<Value>, areEqual?: (a: Param, b: Param) => boolean): AtomFamily<Param, Atom<Value>>;
export {};

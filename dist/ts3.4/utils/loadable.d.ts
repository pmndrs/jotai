import { Atom } from 'jotai';
declare type Loadable<Value> = {
    state: 'loading';
} | {
    state: 'hasError';
    error: unknown;
} | {
    state: 'hasData';
    data: Value;
};
export declare function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>>;
export {};

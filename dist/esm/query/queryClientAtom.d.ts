import { QueryClient } from 'react-query';
export declare const queryClientAtom: import("jotai").Atom<QueryClient> & {
    write: (get: {
        <Value>(atom: import("jotai").Atom<Value | Promise<Value>>): Value;
        <Value_1>(atom: import("jotai").Atom<Promise<Value_1>>): Value_1;
        <Value_2>(atom: import("jotai").Atom<Value_2>): Value_2;
    } & {
        <Value_3>(atom: import("jotai").Atom<Value_3 | Promise<Value_3>>, unstable_promise: true): Value_3 | Promise<Value_3>;
        <Value_4>(atom: import("jotai").Atom<Promise<Value_4>>, unstable_promise: true): Value_4 | Promise<Value_4>;
        <Value_5>(atom: import("jotai").Atom<Value_5>, unstable_promise: true): Value_5 | Promise<Value_5>;
    }, set: {
        <Value_6>(atom: import("jotai").WritableAtom<Value_6, undefined>): void | Promise<void>;
        <Value_7, Update>(atom: import("jotai").WritableAtom<Value_7, Update>, update: Update): void | Promise<void>;
    }, update: QueryClient | ((prev: QueryClient) => QueryClient)) => void | Promise<void>;
    onMount?: (<S extends (update: QueryClient | ((prev: QueryClient) => QueryClient)) => void | Promise<void>>(setAtom: S) => void | (() => void)) | undefined;
} & {
    init: QueryClient;
};

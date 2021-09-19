import type { Atom } from 'jotai';
export declare function waitForAll<Values extends Record<string, unknown>>(atoms: {
    [K in keyof Values]: Atom<Values[K]>;
}): Atom<Values>;
export declare function waitForAll<Values extends readonly unknown[]>(atoms: {
    [K in keyof Values]: Atom<Values[K]>;
}): Atom<Values>;

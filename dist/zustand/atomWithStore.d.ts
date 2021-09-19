import type { State, StoreApi } from 'zustand/vanilla';
export declare function atomWithStore<T extends State>(store: StoreApi<T>): import("jotai").WritableAtom<T, T | ((prev: T) => T)>;

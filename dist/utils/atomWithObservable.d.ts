import type { Atom, Getter, WritableAtom } from 'jotai';
declare global {
    interface SymbolConstructor {
        readonly observable: symbol;
    }
}
declare type Subscription = {
    unsubscribe: () => void;
};
declare type Observer<T> = {
    next: (value: T) => void;
    error: (error: unknown) => void;
    complete: () => void;
};
declare type ObservableLike<T> = {
    subscribe(observer: Observer<T>): Subscription;
    subscribe(next: (value: T) => void, error?: (error: unknown) => void, complete?: () => void): Subscription;
    [Symbol.observable]?: () => ObservableLike<T>;
};
declare type SubjectLike<T> = ObservableLike<T> & Observer<T>;
export declare function atomWithObservable<TData>(createObservable: (get: Getter) => SubjectLike<TData>): WritableAtom<TData, TData>;
export declare function atomWithObservable<TData>(createObservable: (get: Getter) => ObservableLike<TData>): Atom<TData>;
export {};

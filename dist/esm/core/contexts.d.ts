import type { Context } from 'react';
import type { Atom, Scope } from './atom';
declare const createScopeContainerForProduction: (initialValues?: Iterable<readonly [Atom<unknown>, unknown]> | undefined) => readonly [{
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => import("./store").AtomState<unknown> | undefined;
    m: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => {
        l: Set<() => void>;
        d: Set<{
            toString: () => string;
            debugLabel?: string | undefined;
            scope?: Scope | undefined;
            read: (get: {
                <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
                <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
                <Value_4>(atom: Atom<Value_4>): Value_4;
            }) => unknown;
        }>;
        u: void | (() => void);
    } | undefined;
} | {
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a?: undefined;
    m?: undefined;
}];
declare const createScopeContainerForDevelopment: (initialValues?: Iterable<readonly [Atom<unknown>, unknown]> | undefined) => readonly [{
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => import("./store").AtomState<unknown> | undefined;
    m: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => {
        l: Set<() => void>;
        d: Set<{
            toString: () => string;
            debugLabel?: string | undefined;
            scope?: Scope | undefined;
            read: (get: {
                <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
                <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
                <Value_4>(atom: Atom<Value_4>): Value_4;
            }) => unknown;
        }>;
        u: void | (() => void);
    } | undefined;
} | {
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a?: undefined;
    m?: undefined;
}, {
    listeners: Set<() => void>;
    subscribe: (callback: () => void) => () => void;
    atoms: Atom<unknown>[];
}];
export declare const isDevScopeContainer: (scopeContainer: ScopeContainer) => scopeContainer is readonly [{
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => import("./store").AtomState<unknown> | undefined;
    m: (a: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }) => {
        l: Set<() => void>;
        d: Set<{
            toString: () => string;
            debugLabel?: string | undefined;
            scope?: Scope | undefined;
            read: (get: {
                <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
                <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
                <Value_4>(atom: Atom<Value_4>): Value_4;
            }) => unknown;
        }>;
        u: void | (() => void);
    } | undefined;
} | {
    r: <Value>(readingAtom: Atom<Value>) => import("./store").AtomState<Value>;
    w: <Value_1, Update>(writingAtom: import("./atom").WritableAtom<Value_1, Update>, update: Update) => void | Promise<void>;
    f: () => void;
    s: (atom: {
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, callback: () => void) => () => void;
    h: (values: Iterable<readonly [{
        toString: () => string;
        debugLabel?: string | undefined;
        scope?: Scope | undefined;
        read: (get: {
            <Value_2>(atom: Atom<Value_2 | Promise<Value_2>>): Value_2;
            <Value_3>(atom: Atom<Promise<Value_3>>): Value_3;
            <Value_4>(atom: Atom<Value_4>): Value_4;
        }) => unknown;
    }, unknown]>) => void;
    a?: undefined;
    m?: undefined;
}, {
    listeners: Set<() => void>;
    subscribe: (callback: () => void) => () => void;
    atoms: Atom<unknown>[];
}];
declare type ScopeContainerForProduction = ReturnType<typeof createScopeContainerForProduction>;
export declare type ScopeContainerForDevelopment = ReturnType<typeof createScopeContainerForDevelopment>;
export declare type ScopeContainer = ScopeContainerForProduction | ScopeContainerForDevelopment;
declare type CreateScopeContainer = (initialValues?: Iterable<readonly [Atom<unknown>, unknown]>) => ScopeContainer;
export declare const createScopeContainer: CreateScopeContainer;
declare type ScopeContext = Context<ScopeContainer>;
export declare const getScopeContext: (scope?: Scope | undefined) => ScopeContext;
export {};

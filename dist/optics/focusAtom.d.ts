import * as O from 'optics-ts';
import type { SetStateAction, WritableAtom } from 'jotai';
declare type NonFunction<T> = [T] extends [Function] ? never : T;
export declare function focusAtom<S, A>(baseAtom: WritableAtom<S, NonFunction<S>>, callback: (optic: O.OpticFor<S>) => O.Prism<S, any, A>): WritableAtom<A | undefined, SetStateAction<A>>;
export declare function focusAtom<S, A>(baseAtom: WritableAtom<S, NonFunction<S>>, callback: (optic: O.OpticFor<S>) => O.Traversal<S, any, A>): WritableAtom<A[], SetStateAction<A>>;
export declare function focusAtom<S, A>(baseAtom: WritableAtom<S, NonFunction<S>>, callback: (optic: O.OpticFor<S>) => O.Lens<S, any, A> | O.Equivalence<S, any, A> | O.Iso<S, any, A>): WritableAtom<A, SetStateAction<A>>;
export {};

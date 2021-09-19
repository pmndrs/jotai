import type { Setter, WritableAtom } from 'jotai';
import type { Scope } from '../core/atom';
declare type WriteGetter = Parameters<WritableAtom<unknown, unknown>['write']>[0];
declare type Callback<Result, Arg> = undefined extends Arg ? (arg?: Arg) => Promise<Result> : (arg: Arg) => Promise<Result>;
export declare function useAtomCallback<Result, Arg>(callback: (get: WriteGetter, set: Setter, arg: Arg) => Promise<Result>, scope?: Scope): Callback<Result, Arg>;
export declare function useAtomCallback<Result, Arg>(callback: (get: WriteGetter, set: Setter, arg: Arg) => Result, scope?: Scope): Callback<Result, Arg>;
export {};

import type { WritableAtom } from 'jotai';
import type { Scope } from '../core/atom';
export declare function useAtomDevtools<Value>(anAtom: WritableAtom<Value, Value>, name?: string, scope?: Scope): void;

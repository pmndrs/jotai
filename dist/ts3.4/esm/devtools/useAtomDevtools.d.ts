import { WritableAtom } from 'jotai';
import { Scope } from '../core/atom';
export declare function useAtomDevtools<Value>(anAtom: WritableAtom<Value, Value>, name?: string, scope?: Scope): void;

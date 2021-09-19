import type { Atom } from 'jotai';
import type { Scope } from '../core/atom';
export declare function useAtomValue<Value>(anAtom: Atom<Value>, scope?: Scope): Value;

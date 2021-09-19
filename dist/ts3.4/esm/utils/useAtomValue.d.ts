import { Atom } from 'jotai';
import { Scope } from '../core/atom';
export declare function useAtomValue<Value>(anAtom: Atom<Value>, scope?: Scope): Value;

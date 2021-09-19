import { WritableAtom } from 'jotai';
import { Scope } from '../core/atom';
import { RESET } from './constants';
export declare function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>, scope?: Scope): () => void | Promise<void>;

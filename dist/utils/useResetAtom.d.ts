import type { WritableAtom } from 'jotai';
import type { Scope } from '../core/atom';
import { RESET } from './constants';
export declare function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>, scope?: Scope): () => void | Promise<void>;

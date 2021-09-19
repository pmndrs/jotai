import { WritableAtom } from 'jotai';
import { Scope, SetAtom } from '../core/atom';
export declare function useUpdateAtom<Value, Update>(anAtom: WritableAtom<Value, Update>, scope?: Scope): SetAtom<Update>;

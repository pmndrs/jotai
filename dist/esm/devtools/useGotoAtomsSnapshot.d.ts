import type { Atom, Scope } from '../core/atom';
export declare function useGotoAtomsSnapshot(scope?: Scope): (values: Iterable<readonly [Atom<unknown>, unknown]>) => void;

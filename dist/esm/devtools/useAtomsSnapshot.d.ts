import type { Atom, Scope } from '../core/atom';
declare type AtomsSnapshot = Map<Atom<unknown>, unknown>;
export declare function useAtomsSnapshot(scope?: Scope): AtomsSnapshot;
export {};

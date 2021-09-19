import type { Atom, Scope } from '../core/atom';
export declare function useHydrateAtoms(values: Iterable<readonly [Atom<unknown>, unknown]>, scope?: Scope): void;

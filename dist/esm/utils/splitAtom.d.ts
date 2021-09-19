import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai';
export declare function splitAtom<Item, Key>(arrAtom: WritableAtom<Item[], Item[]>, keyExtractor?: (item: Item) => Key): WritableAtom<PrimitiveAtom<Item>[], PrimitiveAtom<Item>>;
export declare function splitAtom<Item, Key>(arrAtom: Atom<Item[]>, keyExtractor?: (item: Item) => Key): Atom<Atom<Item>[]>;

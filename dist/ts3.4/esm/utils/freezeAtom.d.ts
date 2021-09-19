import { Atom } from 'jotai';
export declare function freezeAtom<AtomType extends Atom<any>>(anAtom: AtomType): AtomType;
export declare function freezeAtomCreator<CreateAtom extends (...params: any[]) => Atom<any>>(createAtom: CreateAtom): CreateAtom;

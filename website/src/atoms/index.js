import { atom } from 'jotai';
import { atomWithImmer } from 'jotai/immer';
import { atomWithStorage } from 'jotai/utils';

export const menuAtom = atom(false);
export const searchAtom = atom(false);
export const helpAtom = atom(false);

export const textAtom = atom('hello');
export const uppercaseAtom = atom((get) => get(textAtom).toUpperCase());
export const darkModeAtom = atomWithStorage('darkModeDemo', false);
export const countAtom = atomWithImmer(0);

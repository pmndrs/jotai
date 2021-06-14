import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { atomWithImmer } from 'jotai/immer';

// Website state
export const menuAtom = atom(false);

// Core demo state
export const textAtom = atom('hello');
export const uppercaseAtom = atom((get) => get(textAtom).toUpperCase());

// Utilities demo state
export const darkModeAtom = atomWithStorage('darkMode', false);

// Integrations demo state
export const countAtom = atomWithImmer(0);

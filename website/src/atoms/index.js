/* eslint-disable import/extensions */
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { atomWithImmer } from 'jotai-immer'

export const menuAtom = atom(false)
export const searchAtom = atom(false)
export const helpAtom = atom(false)
export const textAtom = atom('hello')
export const uppercaseAtom = atom((get) => get(textAtom).toUpperCase())
export const darkModeAtom = atomWithStorage('darkMode', false)
export const countAtom = atomWithImmer(0)

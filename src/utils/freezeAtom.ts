import { atom, Atom } from 'jotai'

import type { Getter } from '../core/types'

const deepFreeze = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return
  Object.freeze(obj)
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = obj[name]
    deepFreeze(value)
  }
  return obj
}

export function freezeAtom<T extends Atom<any>>(anAtom: T) {
  const frozenAtom: any = atom(
    (get) => deepFreeze(get(anAtom)),
    (_get, set, arg) => set(anAtom as any, arg)
  )
  frozenAtom.scope = anAtom.scope
  return frozenAtom as T
}

const atomFrozen: typeof atom = ((read: any, write: any) => {
  const anAtom = atom(read, write)
  const origRead = anAtom.read
  anAtom.read = (get: Getter) => deepFreeze(origRead(get))
  return anAtom
}) as any

export const atomFrozenInDev =
  typeof process === 'object' && process.env.NODE_ENV === 'development'
    ? atomFrozen
    : atom

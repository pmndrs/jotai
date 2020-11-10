import { atom, Atom } from 'jotai'

import type { Getter } from '../core/types'

const deepFreeze = (obj: unknown) => {
  if (typeof obj !== 'object' || obj === null) return
  Object.freeze(obj)
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = (obj as any)[name]
    deepFreeze(value)
  }
}

export function freezeAtom<T extends Atom<unknown>>(atomToFreeze: T) {
  const origRead = atomToFreeze.read
  atomToFreeze.read = (get: Getter) => {
    const value = origRead(get)
    deepFreeze(value)
    return value
  }
}

const atomFrozen: typeof atom = ((read: any, write: any) => {
  const anAtom = atom(read, write)
  freezeAtom(anAtom)
  return anAtom
}) as any

export const atomFrozenInDev =
  process.env.NODE_ENV === 'development' ? atomFrozen : atom

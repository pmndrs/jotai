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

export function freezeAtom<AtomType extends Atom<any>>(
  anAtom: AtomType
): AtomType {
  const frozenAtom: any = atom(
    (get) => deepFreeze(get(anAtom)),
    (_get, set, arg) => set(anAtom as any, arg)
  )
  frozenAtom.scope = anAtom.scope
  return frozenAtom
}

export function createFrozenAtom<
  CreateAtom extends (...params: any[]) => Atom<any>
>(createAtom: CreateAtom): CreateAtom {
  return ((...params: any[]) => {
    const anAtom = createAtom(...params)
    const origRead = anAtom.read
    anAtom.read = (get: Getter) => deepFreeze(origRead(get))
    return anAtom
  }) as any
}

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

export function freezeAtom<T extends Atom<any>>(anAtom: T): T {
  const frozenAtom: any = atom(
    (get) => deepFreeze(get(anAtom)),
    (_get, set, arg) => set(anAtom as any, arg)
  )
  frozenAtom.scope = anAtom.scope
  return frozenAtom
}

export function createFrozenAtom<A extends (...params: any[]) => Atom<any>>(
  createAtom: A
): A {
  return ((...params: any[]) => {
    const anAtom = (createAtom as any)(...params)
    const origRead = anAtom.read
    anAtom.read = (get: Getter) => deepFreeze(origRead(get))
    return anAtom
  }) as any
}

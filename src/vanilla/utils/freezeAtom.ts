import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

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
  return memo1(() => {
    const frozenAtom: any = atom(
      (get) => deepFreeze(get(anAtom)),
      (_get, set, arg) => set(anAtom as any, arg)
    )
    return frozenAtom
  }, anAtom)
}

export function freezeAtomCreator<
  CreateAtom extends (...params: any[]) => Atom<any>
>(createAtom: CreateAtom) {
  return ((...params: any[]) => {
    const anAtom = createAtom(...params)
    const origRead = anAtom.read
    anAtom.read = (get, options) => deepFreeze(origRead(get, options))
    return anAtom
  }) as CreateAtom
}

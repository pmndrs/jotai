import { atom } from '../../vanilla.ts'
import type { Atom } from '../../vanilla.ts'

const cache1 = new WeakMap()
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1)

const deepFreeze = (obj: unknown) => {
  if (typeof obj !== 'object' || obj === null) return
  Object.freeze(obj)
  const propNames = Object.getOwnPropertyNames(obj)
  for (const name of propNames) {
    const value = (obj as never)[name]
    deepFreeze(value)
  }
  return obj
}

export function freezeAtom<AtomType extends Atom<unknown>>(
  anAtom: AtomType,
): AtomType {
  return memo1(() => {
    const frozenAtom = atom(
      (get) => deepFreeze(get(anAtom)),
      (_get, set, arg) => set(anAtom as never, arg),
    )
    return frozenAtom as never
  }, anAtom)
}

export function freezeAtomCreator<
  CreateAtom extends (...params: never[]) => Atom<unknown>,
>(createAtom: CreateAtom) {
  return ((...params: never[]) => {
    const anAtom = createAtom(...params)
    const origRead = anAtom.read
    anAtom.read = function (get, options) {
      return deepFreeze(origRead.call(this, get, options))
    }
    return anAtom
  }) as CreateAtom
}

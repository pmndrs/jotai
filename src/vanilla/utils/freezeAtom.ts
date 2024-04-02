import type { Atom, WritableAtom } from '../../vanilla.ts'

const frozenAtoms = new WeakSet<Atom<any>>()

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
): AtomType
export function freezeAtom(
  anAtom: WritableAtom<unknown, unknown[], unknown>,
): WritableAtom<unknown, unknown[], unknown> {
  if (frozenAtoms.has(anAtom)) {
    return anAtom
  }
  frozenAtoms.add(anAtom)

  const origRead = anAtom.read
  anAtom.read = function (get, options) {
    return deepFreeze(origRead.call(this, get, options))
  }
  if ('write' in anAtom) {
    const origWrite = anAtom.write
    anAtom.write = function (get, set, ...args) {
      return origWrite.call(
        this,
        get,
        (...setArgs) => {
          if (setArgs[0] === anAtom) {
            setArgs[1] = deepFreeze(setArgs[1])
          }

          return set(...setArgs)
        },
        ...args,
      )
    }
  }
  return anAtom
}

export function freezeAtomCreator<
  CreateAtom extends (...args: unknown[]) => Atom<unknown>,
>(createAtom: CreateAtom): CreateAtom
export function freezeAtomCreator(
  createAtom: (...args: unknown[]) => WritableAtom<unknown, unknown[], unknown>,
): (...args: unknown[]) => WritableAtom<unknown, unknown[], unknown> {
  return (...args) => freezeAtom(createAtom(...args))
}

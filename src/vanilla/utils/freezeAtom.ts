import type { Atom, WritableAtom } from '../../vanilla.ts'

const frozenAtoms = new WeakSet<Atom<any>>()

const deepFreeze = (value: unknown) => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  Object.freeze(value)
  const propNames = Object.getOwnPropertyNames(value)
  for (const name of propNames) {
    const value = (value as never)[name]
    deepFreeze(value)
  }
  return value
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

/**
 * @deprecated Define it on users end
 */
export function freezeAtomCreator<
  CreateAtom extends (...args: unknown[]) => Atom<unknown>,
>(createAtom: CreateAtom): CreateAtom {
  if (import.meta.env?.MODE !== 'production') {
    console.warn(
      '[DEPRECATED] freezeAtomCreator is deprecated, define it on users end',
    )
  }
  return ((...args: unknown[]) => freezeAtom(createAtom(...args))) as never
}

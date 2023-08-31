import type { Atom } from '../../vanilla.ts'

type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean

export interface AtomFamily<Param, AtomType> {
  (param: Param): AtomType
  keys(): IterableIterator<Param>
  remove(param: Param): void
  setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void
}

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, AtomType>

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean
) {
  type CreatedAt = number // in milliseconds
  let shouldRemove: ShouldRemove<Param> | null = null
  const atoms: Map<Param, [AtomType, CreatedAt]> = new Map()
  const createAtom = (param: Param) => {
    let item: [AtomType, CreatedAt] | undefined
    if (areEqual === undefined) {
      item = atoms.get(param)
    } else {
      // Custom comparator, iterate over all elements
      for (const [key, value] of atoms) {
        if (areEqual(key, param)) {
          item = value
          break
        }
      }
    }

    if (item !== undefined) {
      if (shouldRemove?.(item[1], param)) {
        createAtom.remove(param)
      } else {
        return item[0]
      }
    }

    const newAtom = initializeAtom(param)
    atoms.set(param, [newAtom, Date.now()])
    return newAtom
  }

  createAtom.remove = (param: Param) => {
    if (areEqual === undefined) {
      atoms.delete(param)
    } else {
      for (const [key] of atoms) {
        if (areEqual(key, param)) {
          atoms.delete(key)
          break
        }
      }
    }
  }

  createAtom.setShouldRemove = (fn: ShouldRemove<Param> | null) => {
    shouldRemove = fn
    if (!shouldRemove) return
    for (const [key, value] of atoms) {
      if (shouldRemove(value[1], key)) {
        atoms.delete(key)
      }
    }
  }

  createAtom.keys = () => atoms.keys()

  return createAtom
}

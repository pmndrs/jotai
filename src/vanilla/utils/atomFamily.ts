import type { Atom } from '../../vanilla.ts'

type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean

export interface AtomFamily<Param, AtomType> {
  (param: Param): AtomType
  has(atom: AtomType): boolean
  remove(param: Param): void
  setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void
}

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean,
): AtomFamily<Param, AtomType>

export function atomFamily<Param, AtomType extends Atom<unknown>>(
  initializeAtom: (param: Param) => AtomType,
  areEqual?: (a: Param, b: Param) => boolean,
) {
  type CreatedAt = number // in milliseconds
  let shouldRemove: ShouldRemove<Param> | null = null
  const atoms: Map<Param, [AtomType, CreatedAt]> = new Map()
  const atomSet = new WeakSet<AtomType>()
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
    atomSet.add(newAtom)
    atoms.set(param, [newAtom, Date.now()])
    return newAtom
  }

  createAtom.has = (atom: AtomType) => {
    return atomSet.has(atom)
  }

  createAtom.remove = (param: Param) => {
    if (areEqual === undefined) {
      if (!atoms.has(param)) return
      atomSet.delete(atoms.get(param)![0])
      atoms.delete(param)
    } else {
      for (const [key, value] of atoms) {
        if (areEqual(key, param)) {
          atomSet.delete(value[0])
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
        atomSet.delete(value[0])
        atoms.delete(key)
      }
    }
  }
  return createAtom
}

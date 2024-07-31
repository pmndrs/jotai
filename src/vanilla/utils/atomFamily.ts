import type { Atom } from '../../vanilla.ts'

type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean
type Cleanup = () => void
type Callback<Param, AtomType> = (event: {
  type: 'CREATE' | 'REMOVE'
  param: Param
  atom: AtomType
}) => void

export interface AtomFamily<Param, AtomType> {
  (param: Param): AtomType
  getParams(): Iterable<Param>
  remove(param: Param): void
  setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void
  /**
   * fires when a atom is created or removed
   * This API is for advanced use cases, and can change without notice.
   */
  unstable_listen(callback: Callback<Param, AtomType>): Cleanup
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
  const listeners = new Set<Callback<Param, AtomType>>()
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
    notifyListeners('CREATE', param, newAtom)
    atoms.set(param, [newAtom, Date.now()])
    return newAtom
  }

  function notifyListeners(
    type: 'CREATE' | 'REMOVE',
    param: Param,
    atom: AtomType,
  ) {
    for (const listener of listeners) {
      listener({ type, param, atom })
    }
  }

  createAtom.unstable_listen = (callback: Callback<Param, AtomType>) => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }

  createAtom.getParams = () => atoms.keys()

  createAtom.remove = (param: Param) => {
    if (areEqual === undefined) {
      if (!atoms.has(param)) return
      const [atom] = atoms.get(param)!
      notifyListeners('REMOVE', param, atom)
      atoms.delete(param)
    } else {
      for (const [key, [atom]] of atoms) {
        if (areEqual(key, param)) {
          notifyListeners('REMOVE', key, atom)
          atoms.delete(key)
          break
        }
      }
    }
  }

  createAtom.setShouldRemove = (fn: ShouldRemove<Param> | null) => {
    shouldRemove = fn
    if (!shouldRemove) return
    for (const [key, [atom, createdAt]] of atoms) {
      if (shouldRemove(createdAt, key)) {
        notifyListeners('REMOVE', key, atom)
        atoms.delete(key)
      }
    }
  }
  return createAtom
}

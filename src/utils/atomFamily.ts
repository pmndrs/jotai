import { AnyAtom } from './../core/types'
import { atom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'
import type { Getter, Setter } from '../core/types'

type AnyFunction = (...args: any[]) => any

type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean

type AtomFamily<Param, AtomType> = {
  (param: Param): AtomType
  remove(param: Param): void
  setShouldRemove(shouldRemove: ShouldRemove<Param> | null): void
}

// // writable derived atom
// export function atomFamily<Param, Value, Update>(
//   initializeRead: (param: Param) => (get: Getter) => Value | Promise<Value>,
//   initializeWrite: (
//     param: Param
//   ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
//   areEqual?: (a: Param, b: Param) => boolean
// ): AtomFamily<Param, WritableAtom<Value, Update>>

// // write-only derived atom
// export function atomFamily<Param, Value, Update>(
//   initializeRead: (param: Param) => Value,
//   initializeWrite: (
//     param: Param
//   ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
//   areEqual?: (a: Param, b: Param) => boolean
// ): Value extends AnyFunction
//   ? never
//   : AtomFamily<Param, WritableAtom<Value, Update>>

// // read-only derived atom
// export function atomFamily<Param, Value, Update extends never = never>(
//   initializeRead: (param: Param) => (get: Getter) => Value | Promise<Value>,
//   initializeWrite?: null,
//   areEqual?: (a: Param, b: Param) => boolean
// ): AtomFamily<Param, Atom<Value>>

// // invalid read-only derived atom
// export function atomFamily<Param, Value>(
//   initializeRead: (param: Param) => AnyFunction,
//   initializeWrite?: null,
//   areEqual?: (a: Param, b: Param) => boolean
// ): never

// // primitive atom
// export function atomFamily<Param, Value>(
//   initializeRead: (param: Param) => Value,
//   initializeWrite?: null,
//   areEqual?: (a: Param, b: Param) => boolean
// ): AtomFamily<Param, PrimitiveAtom<Value>>

type AnyAtomType<Value, Update> = Atom<Value> | WritableAtom<Value, Update>
export function atomFamily<Param, Value, Update>(
  initializeAtom: (param: Param) => AnyAtomType<Value, Update>,
  areEqual?: (a: Param, b: Param) => boolean
) {
  type AtomType = AnyAtomType<Value, Update>
  type CreatedAt = number // in milliseconds
  let shouldRemove: ShouldRemove<Param> | null = null
  const atoms: Map<Param, [AtomType, CreatedAt]> = new Map()
  const createAtom = (param: Param) => {
    let item: [AtomType, CreatedAt] | undefined
    if (areEqual === undefined) {
      item = atoms.get(param)
    } else {
      // Custom comparator, iterate over all elements
      for (let [key, value] of atoms) {
        if (areEqual(key, param)) {
          item = value
          break
        }
      }
    }

    if (item !== undefined) {
      if (shouldRemove?.(item[1], param)) {
        atoms.delete(param)
      } else {
        return item[0]
      }
    }

    const newAtom = initializeAtom(param) as AtomType
    atoms.set(param, [newAtom, Date.now()])
    return newAtom
  }

  createAtom.remove = (param: Param) => {
    if (areEqual === undefined) {
      atoms.delete(param)
    } else {
      for (let [key] of atoms) {
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
    for (let [key, value] of atoms) {
      if (shouldRemove(value[1], key)) {
        atoms.delete(key)
      }
    }
  }
  return createAtom
}

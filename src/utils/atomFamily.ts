import { atom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { Getter, Setter } from '../core/types'

type ShouldRemove<Param> = (createdAt: number, param: Param) => boolean

type AtomFamily<Param, AtomType> = {
  (param: Param): AtomType
  remove(param: Param): void
  gc(shoudRemove: ShouldRemove<Param> | null): void
}

// writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => (get: Getter) => Value | Promise<Value>,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value, Update>>

// invalid writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Function,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): never

// write-only derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Value,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value, Update>>

// read-only derived atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => (get: Getter) => Value | Promise<Value>,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, Atom<Value>>

// invalid read-only derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => Function,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): never

// primitive atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => Value,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, PrimitiveAtom<Value>>

export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => any,
  initializeWrite?: null | ((param: Param) => any),
  areEqual: (a: Param, b: Param) => boolean = Object.is
) {
  type AtomType = WritableAtom<Value, Update>
  type CreatedAt = number // in milliseconds
  let shouldRemove: ShouldRemove<Param> | null = null
  const atoms: [Param, AtomType, CreatedAt][] = []
  const createAtom = (param: Param) => {
    const index = atoms.findIndex((x) => areEqual(x[0], param))
    if (index >= 0) {
      const item = atoms[index]
      if (shouldRemove && shouldRemove(item[2], item[0])) {
        atoms.splice(index, 1)
      } else {
        return item[1]
      }
    }
    const newAtom = atom(
      initializeRead(param),
      initializeWrite && initializeWrite(param)
    ) as AtomType
    atoms.unshift([param, newAtom, Date.now()])
    return newAtom
  }
  createAtom.remove = (p: Param) => {
    const index = atoms.findIndex((x) => x[0] === p)
    if (index >= 0) {
      atoms.splice(index, 1)
    }
  }
  createAtom.gc = (fn: ShouldRemove<Param> | null) => {
    shouldRemove = fn
    if (!shouldRemove) return
    let index = 0
    while (index < atom.length) {
      const item = atoms[index]
      if (shouldRemove(item[2], item[0])) {
        atoms.splice(index, 1)
      } else {
        ++index
      }
    }
  }
  return createAtom
}

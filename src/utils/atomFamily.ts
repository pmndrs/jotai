import { atom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { Getter, Setter } from '../core/types'

type AtomFamily<Param, AtomType> = {
  (param: Param): AtomType
  remove(param: Param): void
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
  const atoms: [Param, AtomType][] = []
  const createAtom = (param: Param) => {
    const found = atoms.find((x) => areEqual(x[0], param))
    if (found) {
      return found[1]
    }
    const newAtom = atom(
      initializeRead(param),
      initializeWrite && initializeWrite(param)
    ) as AtomType
    atoms.unshift([param, newAtom])
    return newAtom
  }
  createAtom.remove = (p: Param) => {
    const index = atoms.findIndex((x) => x[0] === p)
    if (index >= 0) {
      atoms.splice(index, 1)
    }
  }
  return createAtom
}

// -----------------------------------------------------------------------

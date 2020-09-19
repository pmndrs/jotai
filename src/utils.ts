import { useCallback, useMemo } from 'react'
import { atom, useAtom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { SetStateAction, Getter, Setter } from './types'

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

const RESET = Symbol()

export const atomWithReset = <Value>(initialValue: Value) => {
  type Update = SetStateAction<Value> | typeof RESET
  const anAtom: any = atom<Value, Update>(initialValue, (get, set, update) => {
    if (update === RESET) {
      set(anAtom, initialValue)
    } else {
      set(
        anAtom,
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : update
      )
    }
  })
  return anAtom as WritableAtom<Value, Update>
}

export const useResetAtom = <Value>(
  anAtom: WritableAtom<Value, typeof RESET>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, _update) => set(anAtom, RESET)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

export const useReducerAtom = <Value, Action>(
  anAtom: PrimitiveAtom<Value>,
  reducer: (v: Value, a: Action) => Value
) => {
  const [state, setState] = useAtom(anAtom)
  const dispatch = useCallback(
    (action: Action) => {
      setState((prev) => reducer(prev, action))
    },
    [setState, reducer]
  )
  return [state, dispatch] as const
}

export const atomWithReducer = <Value, Action>(
  initialValue: Value,
  reducer: (v: Value, a: Action) => Value
) => {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom as WritableAtom<Value, Action>
}

type AtomFamily<Param, AtomType> = {
  (param: Param): AtomType
  remove(param: Param): void
}

// async-read writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => (get: Getter) => Promise<Value>,
  initializeWrite: (
    param: Param
  ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, WritableAtom<Value | Promise<Value>, Update>>

// writable derived atom
export function atomFamily<Param, Value, Update>(
  initializeRead: (param: Param) => (get: Getter) => Value,
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

// async-read read-only derived atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => (get: Getter) => Promise<Value>,
  initializeWrite?: null,
  areEqual?: (a: Param, b: Param) => boolean
): AtomFamily<Param, Atom<Value | Promise<Value>>>

// read-only derived atom
export function atomFamily<Param, Value, Update extends never = never>(
  initializeRead: (param: Param) => (get: Getter) => Value,
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

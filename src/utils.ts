import { useCallback, useMemo } from 'react'
import { atom, useAtom, Atom, WritableAtom, PrimitiveAtom } from 'jotai'

import type {
  NonPromise,
  NonFunction,
  SetStateAction,
  Getter,
  Setter,
} from './types'

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

export const atomWithReset = <Value>(
  initialValue: NonFunction<NonPromise<Value>>
) => {
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
  reducer: (v: Value, a: Action) => NonFunction<Value>
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
  initialValue: NonFunction<NonPromise<Value>>,
  reducer: (v: Value, a: Action) => Value
) => {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom as WritableAtom<Value, Action>
}

type AtomFamilyReturnType<Param, AtomType> = {
  (param: Param): AtomType
  remove(atom: AtomType): void
}

type AtomFamily = {
  // writable derived atom
  <Param, Value, Update>(
    initializeRead: (param?: Param) => (get: Getter) => NonPromise<Value>,
    initializeWrite: (
      param?: Param
    ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, WritableAtom<Value, Update>>
  // write-only derived atom
  <Param, Value, Update>(
    initializeRead: (param?: Param) => NonFunction<NonPromise<Value>>,
    initializeWrite: (
      param?: Param
    ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, WritableAtom<Value, Update>>
  // async-read writable derived atom
  <Param, Value, Update>(
    initializeRead: (param?: Param) => (get: Getter) => Promise<Value>,
    initializeWrite: (
      param?: Param
    ) => (get: Getter, set: Setter, update: Update) => void | Promise<void>,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, WritableAtom<Value | Promise<Value>, Update>>
  // read-only derived atom
  <Param, Value>(
    initializeRead: (param?: Param) => (get: Getter) => NonPromise<Value>,
    initializeWrite?: null,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, Atom<Value>>
  // async-read read-only derived atom
  <Param, Value>(
    initializeRead: (param?: Param) => (get: Getter) => Promise<Value>,
    initializeWrite?: null,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, Atom<Value | Promise<Value>>>
  // primitive atom
  <Param, Value>(
    initializeRead: (param?: Param) => NonFunction<NonPromise<Value>>,
    initializeWrite?: null,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, PrimitiveAtom<Value>>
}

export const atomFamily: AtomFamily = <Param, AtomType>(
  initializeRead: (param?: Param) => any,
  initializeWrite?: null | ((param?: Param) => any),
  areEqual: (a: Param, b: Param) => boolean = Object.is
) => {
  const atoms: [Param, AtomType][] = []
  const createAtom = (param: Param) => {
    const found = atoms.find((x) => areEqual(x[0], param))
    if (found) {
      return found[1]
    }
    const newAtom = (atom(
      initializeRead(param),
      initializeWrite && initializeWrite(param)
    ) as unknown) as AtomType
    atoms.unshift([param, newAtom])
    return newAtom
  }
  createAtom.remove = (a: AtomType) => {
    const index = atoms.findIndex((x) => x[1] === a)
    if (index >= 0) {
      atoms.splice(index, 1)
    }
  }
  return createAtom
}

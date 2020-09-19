import { useCallback, useMemo } from 'react'
import { atom, useAtom, WritableAtom, PrimitiveAtom } from 'jotai'

import type { SetStateAction } from './types'

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

type AtomReturnType<Read, Write> = typeof atom extends (
  read: Read,
  write: Write
) => infer R
  ? R
  : typeof atom extends (read: Read) => infer R
  ? R
  : never

type AtomFamilyReturnType<Param, Read, Write> = {
  (param: Param): AtomReturnType<Read, Write>
  remove(param: Param): void
}

type AtomFamily = {
  <Param, Read, Write>(
    initializeRead: (param?: Param) => Read,
    initializeWrite: (param?: Param) => Write,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, Read, Write>
  <Param, Read>(
    initializeRead: (param?: Param) => Read,
    initializeWrite?: null,
    areEqual?: (a: Param, b: Param) => boolean
  ): AtomFamilyReturnType<Param, Read, never>
}

export const atomFamily: AtomFamily = <Param, Read, Write>(
  initializeRead: (param?: Param) => Read,
  initializeWrite?: null | ((param?: Param) => Write),
  areEqual: (a: Param, b: Param) => boolean = Object.is
) => {
  type AtomType = AtomReturnType<Read, Write>
  const atoms: [Param, AtomType][] = []
  const createAtom = (param: Param) => {
    const found = atoms.find((x) => areEqual(x[0], param))
    if (found) {
      return found[1]
    }
    const newAtom: AtomType = atom(
      initializeRead(param),
      initializeWrite && (initializeWrite(param) as any)
    )
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

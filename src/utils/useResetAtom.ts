import { useMemo } from 'react'
import { atom, useAtom, WritableAtom } from 'jotai'

import type { SetStateAction } from '../core/types'

export const RESET = Symbol()

export function atomWithReset<Value>(initialValue: Value) {
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

export function useResetAtom<Value>(anAtom: WritableAtom<Value, typeof RESET>) {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, _update) => set(anAtom, RESET)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

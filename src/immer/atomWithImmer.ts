import { produce } from 'immer'
import type { Draft } from 'immer'
import { atom } from 'jotai'
import type { WritableAtom } from 'jotai'

export function atomWithImmer<Value>(
  initialValue: Value
): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)> {
  const anAtom: any = atom(
    initialValue,
    (get, set, fn: Value | ((draft: Draft<Value>) => void)) =>
      set(
        anAtom,
        produce(
          get(anAtom),
          typeof fn === 'function'
            ? (fn as (draft: Draft<Value>) => void)
            : () => fn
        )
      )
  )

  return anAtom
}

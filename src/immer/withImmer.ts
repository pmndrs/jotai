/* eslint-disable import/named */
import { produce } from 'immer'
import type { Draft } from 'immer'
import { atom } from 'jotai'
import type { PrimitiveAtom, WritableAtom } from 'jotai'
import { createMemoizeAtom } from '../utils/weakCache'

const memoizeAtom = createMemoizeAtom()

export function withImmer<Value>(
  anAtom: PrimitiveAtom<Value>
): WritableAtom<Value, Value | ((draft: Draft<Value>) => void), void>

export function withImmer<Value>(
  anAtom: WritableAtom<Value, Value, void>
): WritableAtom<Value, Value | ((draft: Draft<Value>) => void), void>

export function withImmer<Value>(anAtom: WritableAtom<Value, Value, void>) {
  return memoizeAtom(() => {
    const derivedAtom = atom(
      (get) => get(anAtom),
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
    return derivedAtom
  }, [anAtom])
}

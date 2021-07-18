/* eslint-disable import/named */
import { Draft, produce } from 'immer'
import { PrimitiveAtom, WritableAtom, atom } from 'jotai'
import { getWeakCacheItem, setWeakCacheItem } from '../utils/weakCache'

const withImmerCache = new WeakMap()

export function withImmer<Value>(
  anAtom: PrimitiveAtom<Value>
): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>

export function withImmer<Value>(
  anAtom: WritableAtom<Value, Value>
): WritableAtom<Value, Value | ((draft: Draft<Value>) => void)>

export function withImmer<Value>(anAtom: WritableAtom<Value, Value>) {
  const deps: object[] = [anAtom]
  const cachedAtom = getWeakCacheItem(withImmerCache, deps)
  if (cachedAtom) {
    return cachedAtom
  }
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
  derivedAtom.scope = anAtom.scope
  setWeakCacheItem(withImmerCache, deps, derivedAtom)
  return derivedAtom
}

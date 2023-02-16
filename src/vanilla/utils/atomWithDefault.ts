import { atom } from 'jotai/vanilla'
import type { SetStateAction, WritableAtom } from 'jotai/vanilla'
import { RESET } from './constants'

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['read']

const updateValue = <Value>(
  prevValue: Value,
  update: SetStateAction<Value>
): Value =>
  typeof update === 'function'
    ? (update as (prev: Value) => Value)(prevValue)
    : update

export function atomWithDefault<Value>(
  getDefault: Read<
    Promise<Value>,
    [SetStateAction<Awaited<Value>> | typeof RESET],
    void
  >
): WritableAtom<
  Promise<Value> | Value,
  [SetStateAction<Awaited<Value>> | typeof RESET],
  void | Promise<void>
>

export function atomWithDefault<Value>(
  getDefault: Read<Value, [SetStateAction<Awaited<Value>> | typeof RESET], void>
): WritableAtom<Value, [SetStateAction<Awaited<Value>> | typeof RESET], void>

export function atomWithDefault<Value>(
  getDefault: Read<Value, [SetStateAction<Awaited<Value>> | typeof RESET], void>
) {
  const EMPTY = Symbol()
  const overwrittenAtom = atom<Value | typeof EMPTY>(EMPTY)
  const anAtom: WritableAtom<
    Value,
    [SetStateAction<Awaited<Value>> | typeof RESET],
    void | Promise<void>
  > = atom(
    (get, options) => {
      const overwritten = get(overwrittenAtom)
      if (overwritten !== EMPTY) {
        return overwritten
      }
      return getDefault(get, options)
    },
    (get, set, update) => {
      if (update === RESET) {
        return set(overwrittenAtom, EMPTY)
      }
      const prevValue = get(anAtom)
      if (prevValue instanceof Promise) {
        return prevValue.then((v) =>
          set(overwrittenAtom, updateValue(v, update))
        )
      }
      return set(
        overwrittenAtom,
        updateValue(prevValue as Awaited<Value>, update)
      )
    }
  )
  return anAtom
}

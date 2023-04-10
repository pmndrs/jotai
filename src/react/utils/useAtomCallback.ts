import { useMemo } from 'react'
import { useSetAtom } from '../../react.ts'
import { atom } from '../../vanilla.ts'
import type { Getter, Setter } from '../../vanilla.ts'

type Options = Parameters<typeof useSetAtom>[1]

export function useAtomCallback<Result, Args extends unknown[]>(
  callback: (get: Getter, set: Setter, ...arg: Args) => Result,
  options?: Options
): (...args: Args) => Result {
  const anAtom = useMemo(
    () => atom(null, (get, set, ...args: Args) => callback(get, set, ...args)),
    [callback]
  )
  return useSetAtom(anAtom, options)
}

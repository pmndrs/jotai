import { useMemo } from 'react'
import { useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'
import type { Getter, Setter } from 'jotai/vanilla'

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

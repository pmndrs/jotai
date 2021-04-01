import { useCallback, useMemo } from 'react'
import { atom, useAtom } from 'jotai'

import type { Getter, Setter, Scope } from '../core/types'

type UntypedArgError = {
  error: 'you must manually assign type to the Arg argument'
}

export function useAtomCallback<Result, Arg = UntypedArgError>(
  callback: (get: Getter, set: Setter, arg: Arg) => Result,
  scope?: Scope
): Arg extends UntypedArgError
  ? () => Promise<Result>
  : (arg: Arg) => Promise<Result>

export function useAtomCallback<Result, Arg>(
  callback: (get: Getter, set: Setter, arg: Arg) => Result,
  scope?: Scope
) {
  const anAtom = useMemo(
    () =>
      atom(
        null,
        (
          get,
          set,
          [arg, resolve, reject]: [
            Arg,
            (result: Result) => void,
            (reason: unknown) => void
          ]
        ) => {
          try {
            resolve(callback(get, set, arg))
          } catch (e) {
            reject(e)
          }
        }
      ),
    [callback]
  )
  anAtom.scope = scope
  const [, invoke] = useAtom(anAtom)
  return useCallback(
    (arg: Arg) =>
      new Promise<Result>((resolve, reject) => {
        invoke([arg, resolve, reject])
      }),
    [invoke]
  )
}

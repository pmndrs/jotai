import { useCallback, useMemo } from 'react'
import { atom, useSetAtom } from 'jotai'
import type { Setter, WritableAtom } from 'jotai'
import type { Scope } from '../core/atom'

type WriteGetter = Parameters<WritableAtom<unknown, unknown>['write']>[0]

type Callback<Result, Arg> = undefined extends Arg
  ? (arg?: Arg) => Promise<Result>
  : (arg: Arg) => Promise<Result>

export function useAtomCallback<Result, Arg>(
  callback: (get: WriteGetter, set: Setter, arg: Arg) => Promise<Result>,
  scope?: Scope
): Callback<Result, Arg>

export function useAtomCallback<Result, Arg>(
  callback: (get: WriteGetter, set: Setter, arg: Arg) => Result,
  scope?: Scope
): Callback<Result, Arg>

export function useAtomCallback<Result, Arg>(
  callback: (get: WriteGetter, set: Setter, arg: Arg) => Result,
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
  const invoke = useSetAtom(anAtom, scope)
  return useCallback(
    (arg: Arg) =>
      new Promise<Result>((resolve, reject) => {
        invoke([arg, resolve, reject])
      }),
    [invoke]
  )
}

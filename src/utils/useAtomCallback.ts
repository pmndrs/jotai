import { useCallback, useMemo } from 'react'
import { atom, useSetAtom } from 'jotai'
import type { Setter, WritableAtom } from 'jotai'
import type { Scope } from '../core/atom'

type WriteGetter = Parameters<WritableAtom<unknown, unknown>['write']>[0]

type Callback<Result, Arg> = undefined extends Arg
  ? (arg?: Arg) => Result
  : (arg: Arg) => Result

export function useAtomCallback<Result, Arg>(
  callback: (get: WriteGetter, set: Setter, arg: Arg) => Promise<Result>,
  scope?: Scope
): Callback<Promise<Result>, Arg>

export function useAtomCallback<Result, Arg>(
  callback: (get: WriteGetter, set: Setter, arg: Arg) => Result,
  scope?: Scope
): Callback<Result | Promise<Result>, Arg>

export function useAtomCallback<Result, Arg>(
  callback: (
    get: WriteGetter,
    set: Setter,
    arg: Arg
  ) => Result | Promise<Result>,
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
            (result: Result | Promise<Result>) => void,
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
    (arg: Arg) => {
      let isSync = true
      let settled: { v?: Result | Promise<Result>; e?: unknown } = {}
      const promise = new Promise<Result>((resolve, reject) => {
        invoke([
          arg,
          (v) => {
            if (isSync) {
              settled = { v }
            } else {
              resolve(v)
            }
          },
          (e) => {
            if (isSync) {
              settled = { e }
            } else {
              reject(e)
            }
          },
        ])
      })
      isSync = false
      if ('e' in settled) {
        throw settled.e
      }
      if ('v' in settled) {
        return settled.v
      }
      return promise
    },
    [invoke]
  )
}

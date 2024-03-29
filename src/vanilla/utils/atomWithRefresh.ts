import { atom } from '../../vanilla.ts'
import type { WritableAtom } from '../../vanilla.ts'

type Read<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['read']
type Write<Value, Args extends unknown[], Result> = WritableAtom<
  Value,
  Args,
  Result
>['write']

export function atomWithRefresh<Value, Args extends unknown[], Result>(
  read: Read<Value, Args, Result>,
  write: Write<Value, Args, Result>,
): WritableAtom<Value, Args | [], Result | void>

export function atomWithRefresh<Value>(
  read: Read<Value, [], void>,
): WritableAtom<Value, [], void>

export function atomWithRefresh<Value, Args extends unknown[], Result>(
  read: Read<Value, Args, Result>,
  write?: Write<Value, Args, Result>,
) {
  const refreshAtom = atom(0)
  if (import.meta.env?.MODE !== 'production') {
    refreshAtom.debugPrivate = true
  }
  return atom(
    (get, options) => {
      get(refreshAtom)
      return read(get, options as never)
    },
    (get, set, ...args: Args) => {
      if (args.length === 0) {
        set(refreshAtom, (c) => c + 1)
      } else if (write) {
        return write(get, set, ...args)
      }
    },
  )
}

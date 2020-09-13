import { useMemo } from 'react'
import { atom, WritableAtom, useAtom } from 'jotai'

type NonPromise<T> = T extends Promise<unknown> ? never : T
type NonFunction<T> = T extends Function ? never : T

export const useUpdateAtom = <Value, Update>(
  anAtom: WritableAtom<Value, Update>
) => {
  const writeOnlyAtom = useMemo(
    () => atom(null, (_get, set, update: Update) => set(anAtom, update)),
    [anAtom]
  )
  return useAtom(writeOnlyAtom)[1]
}

export const reducerAtom = <Value, Action>(
  initialValue: NonFunction<NonPromise<Value>>,
  reducer: (v: Value, a: Action) => Value
) => {
  const anAtom: any = atom<Value, Action>(initialValue, (get, set, action) =>
    set(anAtom, reducer(get(anAtom), action))
  )
  return anAtom as WritableAtom<Value, Action>
}

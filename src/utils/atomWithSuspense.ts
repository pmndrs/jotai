import { atom } from 'jotai'
import type { SetStateAction } from 'jotai'

export function atomWithSuspense<Value>() {
  const SUSPENSE = Symbol()
  let ready: (value: Value) => void
  const wait = new Promise<Value>((resolve) => {
    ready = resolve
  })
  const valueAtom = atom<Value | typeof SUSPENSE>(SUSPENSE)
  const anAtom = atom<Value | Promise<Value>, SetStateAction<Value>>(
    (get) => {
      const value = get(valueAtom)
      return value === SUSPENSE ? wait : value
    },
    (get, set, update) => {
      const value =
        typeof update === 'function'
          ? (update as (prev: Value) => Value)(get(anAtom))
          : update
      set(valueAtom, value)
      ready(value)
    }
  )
  return anAtom
}

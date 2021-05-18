import { atom, WritableAtom } from 'jotai'
import { atomWithStorage, Storage } from './atomWithStorage'

export function atomWithToggle(
  initialValue?: boolean,
  key?: string,
  storage?: Storage<boolean>
) {
  const storeAtom = key ? atomWithStorage(key, initialValue!, storage) : null
  const anAtom: any = atom(initialValue, (get, set, state?: boolean) => {
    const update = state ?? !get(anAtom)
    set(anAtom, update)
    storeAtom && set(storeAtom, update)
  })
  return anAtom as WritableAtom<boolean, boolean | undefined>
}

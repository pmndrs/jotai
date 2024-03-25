import { atom } from '../../vanilla.ts'
import type { SetStateAction } from '../../vanilla.ts'

export function atomWithLazy<Value>(makeInitial: () => Value) {
  const wrappedAtom = atom(() => atom(makeInitial()))

  return atom(
    (get) => get(get(wrappedAtom)),
    (get, set, value: SetStateAction<Value>) => set(get(wrappedAtom), value),
  )
}

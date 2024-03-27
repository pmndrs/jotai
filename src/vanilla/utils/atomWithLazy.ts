import { atom } from '../../vanilla.ts'
import type { Atom, PrimitiveAtom, SetStateAction } from '../../vanilla.ts'

export function atomWithLazy<Value>(makeInitial: () => Value) {
  const wrappedAtom: Atom<PrimitiveAtom<Value>> & { init?: Atom<undefined> } =
    atom(() => atom(makeInitial()))

  const proxyAtom = atom(
    (get) => get(get(wrappedAtom)),
    (get, set, value: SetStateAction<Value>) => set(get(wrappedAtom), value),
  )

  wrappedAtom.init = atom(undefined)
  // when writing to wrappedAtom through proxyAtom, the store
  // thinks we are actually storing the value of `proxyAtom`.
  wrappedAtom.unstable_is = (a) =>
    a.unstable_is ? a.unstable_is(proxyAtom) : a === proxyAtom

  return proxyAtom
}

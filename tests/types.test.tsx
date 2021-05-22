import { expectType } from 'ts-expect'
import { atom, Atom, WritableAtom } from '../src/index'
import { WithInitialValue } from '../src/core/atom'

it('atom() should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    expectType<Atom<number> & WithInitialValue<number>>(primitiveAtom)

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    expectType<Atom<number>>(readonlyDerivedAtom)

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      }
    )
    expectType<WritableAtom<number, number>>(readWriteDerivedAtom)

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<WritableAtom<null, unknown> & WithInitialValue<null>>(
      writeonlyDerivedAtom
    )
  }
})

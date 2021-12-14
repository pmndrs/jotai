import { expectType } from 'ts-expect'
import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai'
import { atom, useAtom } from 'jotai'
import { useAtomValue, waitForAll } from 'jotai/utils'
import type { SetAtom } from '../src/core/atom'

it('waitForAll() should return the correct types', () => {
  function Component() {
    const numberAtom = atom(async () => 0)
    const stringAtom = atom(async () => '')

    const [number, string] = useAtomValue(waitForAll([numberAtom, stringAtom]))
    expectType<number>(number)
    expectType<string>(string)

    const { numberAtom: number2, stringAtom: string2 } = useAtomValue(
      waitForAll({ numberAtom, stringAtom })
    )
    expectType<number>(number2)
    expectType<string>(string2)
  }
  Component
})

it('atom() should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    expectType<PrimitiveAtom<number>>(primitiveAtom)

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
    expectType<WritableAtom<null, number>>(writeonlyDerivedAtom)
  }
  Component
})

it('useAtom should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    expectType<[number, SetAtom<number, void>]>(useAtom(primitiveAtom))

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    expectType<[number, SetAtom<number, void>]>(useAtom(readonlyDerivedAtom))

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      }
    )
    expectType<[number, SetAtom<number, void>]>(useAtom(readWriteDerivedAtom))

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<[null, SetAtom<number, void>]>(useAtom(writeonlyDerivedAtom))
  }
  Component
})

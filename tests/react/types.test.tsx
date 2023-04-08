import { expectType } from 'ts-expect'
import { it } from 'vitest'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

it('useAtom should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    expectType<[number, (arg: number) => void]>(useAtom(primitiveAtom))

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    expectType<[number, (arg: number) => void]>(useAtom(readonlyDerivedAtom))

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      }
    )
    expectType<[number, (arg: number) => void]>(useAtom(readWriteDerivedAtom))

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<[null, (arg: number) => void]>(useAtom(writeonlyDerivedAtom))
  }
  Component
})

it('useAtom should handle inference of atoms (#1831 #1387)', () => {
  const fieldAtoms = {
    username: atom(''),
    age: atom(0),
    checked: atom(false),
  }

  const useField = <T extends keyof typeof fieldAtoms>(prop: T) => {
    return useAtom(fieldAtoms[prop])
  }
  function Component() {
    expectType<[string, (arg: string) => void]>(useField('username'))
    expectType<[number, (arg: number) => void]>(useField('age'))
    expectType<[boolean, (arg: boolean) => void]>(useField('checked'))
  }
  Component
})

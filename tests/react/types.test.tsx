import { expectType } from 'ts-expect'
import type { TypeEqual } from 'ts-expect'
import { expect, it } from 'vitest'
import { useAtom, useSetAtom } from 'jotai/react'
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
      },
    )
    expectType<[number, (arg: number) => void]>(useAtom(readWriteDerivedAtom))

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    expectType<[null, (arg: number) => void]>(useAtom(writeonlyDerivedAtom))
  }
  expect(Component).toBeDefined()
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
    const [username, setUsername] = useField('username')
    expect(username).toBeDefined()
    expect(setUsername).toBeDefined()
    expectType<TypeEqual<string, typeof username>>(true)
    expectType<
      TypeEqual<
        (arg: string | ((prev: string) => string)) => void,
        typeof setUsername
      >
    >(true)
    const [age, setAge] = useField('age')
    expect(age).toBeDefined()
    expect(setAge).toBeDefined()
    expectType<TypeEqual<number, typeof age>>(true)
    expectType<
      TypeEqual<
        (arg: number | ((prev: number) => number)) => void,
        typeof setAge
      >
    >(true)
    const [checked, setChecked] = useField('checked')
    expect(checked).toBeDefined()
    expect(setChecked).toBeDefined()
    expectType<TypeEqual<boolean, typeof checked>>(true)
    expectType<
      TypeEqual<
        (arg: boolean | ((prev: boolean) => boolean)) => void,
        typeof setChecked
      >
    >(true)
  }
  expect(Component).toBeDefined()
})

it('useAtom should handle inference of read-only atoms', () => {
  const fieldAtoms = {
    username: atom(() => ''),
    age: atom(() => 0),
    checked: atom(() => false),
  }
  const useField = <T extends keyof typeof fieldAtoms>(prop: T) => {
    return useAtom(fieldAtoms[prop])
  }
  function Component() {
    expectType<[string, never]>(useField('username'))
    expectType<[number, never]>(useField('age'))
    expectType<[boolean, never]>(useField('checked'))
  }
  expect(Component).toBeDefined()
})

it('useSetAtom should handle inference of atoms', () => {
  const fieldAtoms = {
    username: atom(''),
    age: atom(0),
    checked: atom(false),
  }
  const useSetField = <T extends keyof typeof fieldAtoms>(prop: T) => {
    return useSetAtom(fieldAtoms[prop])
  }
  function Component() {
    const setUsername = useSetField('username')
    expect(setUsername).toBeDefined()
    expectType<
      TypeEqual<
        (arg: string | ((prev: string) => string)) => void,
        typeof setUsername
      >
    >(true)
    const setAge = useSetField('age')
    expect(setAge).toBeDefined()
    expectType<
      TypeEqual<
        (arg: number | ((prev: number) => number)) => void,
        typeof setAge
      >
    >(true)
    const setChecked = useSetField('checked')
    expect(setChecked).toBeDefined()
    expectType<
      TypeEqual<
        (arg: boolean | ((prev: boolean) => boolean)) => void,
        typeof setChecked
      >
    >(true)
  }
  expect(Component).toBeDefined()
})

it('useAtom should handle primitive atom with one type argeument', () => {
  const countAtom = atom(0)
  function Component() {
    const [count, setCount] = useAtom<number>(countAtom)
    expect(count).toBeDefined()
    expect(setCount).toBeDefined()
    expectType<TypeEqual<typeof count, number>>(true)
    expectType<
      TypeEqual<
        typeof setCount,
        (arg: number | ((prev: number) => number)) => void
      >
    >(true)
  }
  expect(Component).toBeDefined()
})

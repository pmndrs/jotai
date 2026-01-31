import { expect, expectTypeOf, it } from 'vitest'
import { useAtom, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

it('useAtom should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    // NOTE: expectTypeOf is not available in TypeScript 4.0.5 and below
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useAtom(primitiveAtom)).toEqualTypeOf<
      [number, (arg: number | ((prev: number) => number)) => void]
    >()

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useAtom(readonlyDerivedAtom)).toEqualTypeOf<[number, never]>()

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      },
    )
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useAtom(readWriteDerivedAtom)).toEqualTypeOf<
      [number, (arg: number) => void]
    >()

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useAtom(writeonlyDerivedAtom)).toEqualTypeOf<
      [null, () => void]
    >()
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
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(username).toEqualTypeOf<string>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setUsername).toEqualTypeOf<
      (arg: string | ((prev: string) => string)) => void
    >()

    const [age, setAge] = useField('age')
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(age).toEqualTypeOf<number>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setAge).toEqualTypeOf<
      (arg: number | ((prev: number) => number)) => void
    >()

    const [checked, setChecked] = useField('checked')
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(checked).toEqualTypeOf<boolean>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setChecked).toEqualTypeOf<
      (arg: boolean | ((prev: boolean) => boolean)) => void
    >()
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
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useField('username')).toEqualTypeOf<[string, never]>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useField('age')).toEqualTypeOf<[number, never]>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(useField('checked')).toEqualTypeOf<[boolean, never]>()
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
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setUsername).toEqualTypeOf<
      (arg: string | ((prev: string) => string)) => void
    >()

    const setAge = useSetField('age')
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setAge).toEqualTypeOf<
      (arg: number | ((prev: number) => number)) => void
    >()

    const setChecked = useSetField('checked')
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setChecked).toEqualTypeOf<
      (arg: boolean | ((prev: boolean) => boolean)) => void
    >()
  }
  expect(Component).toBeDefined()
})

it('useAtom should handle primitive atom with one type argument', () => {
  const countAtom = atom(0)
  function Component() {
    const [count, setCount] = useAtom<number>(countAtom)
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(count).toEqualTypeOf<number>()
    // [ONLY-TS-4.0.5] [ONLY-TS-3.9.7] [ONLY-TS-3.8.3] @ts-ignore
    expectTypeOf(setCount).toEqualTypeOf<
      (arg: number | ((prev: number) => number)) => void
    >()
  }
  expect(Component).toBeDefined()
})

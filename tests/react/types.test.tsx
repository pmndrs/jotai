// NOTE: Using variable assignment for type checking instead of expectTypeOf
// because TypeScript 3.8.3 doesn't support generic type arguments on untyped function calls.
import { expect, it } from 'vitest'
import { useAtom, useSetAtom } from 'jotai/react'
import { atom } from 'jotai/vanilla'

it('useAtom should return the correct types', () => {
  function Component() {
    // primitive atom
    const primitiveAtom = atom(0)
    const _primitiveAtomResult: [number, (arg: number) => void] =
      useAtom(primitiveAtom)
    expect(_primitiveAtomResult).toBeDefined()

    // read-only derived atom
    const readonlyDerivedAtom = atom((get) => get(primitiveAtom) * 2)
    const _readonlyDerivedAtomResult: [number, (arg: number) => void] =
      useAtom(readonlyDerivedAtom)
    expect(_readonlyDerivedAtomResult).toBeDefined()

    // read-write derived atom
    const readWriteDerivedAtom = atom(
      (get) => get(primitiveAtom),
      (get, set, value: number) => {
        set(primitiveAtom, get(primitiveAtom) + value)
      },
    )
    const _readWriteDerivedAtomResult: [number, (arg: number) => void] =
      useAtom(readWriteDerivedAtom)
    expect(_readWriteDerivedAtomResult).toBeDefined()

    // write-only derived atom
    const writeonlyDerivedAtom = atom(null, (get, set) => {
      set(primitiveAtom, get(primitiveAtom) - 1)
    })
    const _writeonlyDerivedAtomResult: [null, (arg: number) => void] =
      useAtom(writeonlyDerivedAtom)
    expect(_writeonlyDerivedAtomResult).toBeDefined()
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
    const _username: string = username
    const _setUsername: (arg: string | ((prev: string) => string)) => void =
      setUsername
    expect(_username).toBeDefined()
    expect(_setUsername).toBeDefined()

    const [age, setAge] = useField('age')
    expect(age).toBeDefined()
    expect(setAge).toBeDefined()
    const _age: number = age
    const _setAge: (arg: number | ((prev: number) => number)) => void = setAge
    expect(_age).toBeDefined()
    expect(_setAge).toBeDefined()

    const [checked, setChecked] = useField('checked')
    expect(checked).toBeDefined()
    expect(setChecked).toBeDefined()
    const _checked: boolean = checked
    const _setChecked: (arg: boolean | ((prev: boolean) => boolean)) => void =
      setChecked
    expect(_checked).toBeDefined()
    expect(_setChecked).toBeDefined()
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
    const _username: [string, never] = useField('username')
    const _age: [number, never] = useField('age')
    const _checked: [boolean, never] = useField('checked')
    expect(_username).toBeDefined()
    expect(_age).toBeDefined()
    expect(_checked).toBeDefined()
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
    const _setUsername: (arg: string | ((prev: string) => string)) => void =
      setUsername
    expect(_setUsername).toBeDefined()

    const setAge = useSetField('age')
    expect(setAge).toBeDefined()
    const _setAge: (arg: number | ((prev: number) => number)) => void = setAge
    expect(_setAge).toBeDefined()

    const setChecked = useSetField('checked')
    expect(setChecked).toBeDefined()
    const _setChecked: (arg: boolean | ((prev: boolean) => boolean)) => void =
      setChecked
    expect(_setChecked).toBeDefined()
  }
  expect(Component).toBeDefined()
})

it('useAtom should handle primitive atom with one type argeument', () => {
  const countAtom = atom(0)
  function Component() {
    const [count, setCount] = useAtom<number>(countAtom)
    expect(count).toBeDefined()
    expect(setCount).toBeDefined()
    const _count: number = count
    const _setCount: (arg: number | ((prev: number) => number)) => void =
      setCount
    expect(_count).toBeDefined()
    expect(_setCount).toBeDefined()
  }
  expect(Component).toBeDefined()
})

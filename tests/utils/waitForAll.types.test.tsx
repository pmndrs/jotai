import { expectType } from 'ts-expect'
import { atom, useAtomValue } from 'jotai'
import { waitForAll } from 'jotai/utils'

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

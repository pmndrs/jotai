import { atom, Provider, useAtom } from 'jotai'
import React from 'react'
import * as rtl from '@testing-library/react'
import { focusAtom } from '../../src/optics/focusAtom'

const succ = (input: number) => input + 1

it('basic derivation using focus works', async () => {
  const bigAtom = atom({ a: 0 })
  const aAtom = focusAtom(bigAtom, (optic) => optic.prop('a'))

  const Counter: React.FC = () => {
    const [count, setCount] = useAtom(aAtom)
    const [bigAtomValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>count: {count}</div>
        <button onClick={() => setCount(succ)}>incr</button>
        <button onClick={() => setCount(0)}>set zero</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('bigAtom: {"a":0}')

  rtl.fireEvent.click(getByText('incr'))
  await findByText('count: 1')
  await findByText('bigAtom: {"a":1}')

  rtl.fireEvent.click(getByText('incr'))
  await findByText('count: 2')
  await findByText('bigAtom: {"a":2}')

  rtl.fireEvent.click(getByText('set zero'))
  await findByText('count: 0')
  await findByText('bigAtom: {"a":0}')
})

it('focus on an atom works', async () => {
  const bigAtom = atom({ a: 0 })

  const Counter: React.FC = () => {
    const aAtom = focusAtom(bigAtom, (optic) => optic.prop('a'))
    const [count, setCount] = useAtom(aAtom)
    const [bigAtomValue] = useAtom(bigAtom)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>count: {count}</div>
        <button onClick={() => setCount(succ)}>button</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('count: 0')
  await findByText('bigAtom: {"a":0}')

  rtl.fireEvent.click(getByText('button'))
  await findByText('count: 1')
  await findByText('bigAtom: {"a":1}')
})

it('double-focus on an atom works', async () => {
  const bigAtom = atom({ a: { b: 0 } })
  const atomA = focusAtom(bigAtom, (optic) => optic.prop('a'))
  const atomB = focusAtom(atomA, (optic) => optic.prop('b'))

  const Counter: React.FC = () => {
    const [bigAtomValue, setBigAtom] = useAtom(bigAtom)
    const [atomAValue, setAtomA] = useAtom(atomA)
    const [atomBValue, setAtomB] = useAtom(atomB)
    return (
      <>
        <div>bigAtom: {JSON.stringify(bigAtomValue)}</div>
        <div>atomA: {JSON.stringify(atomAValue)}</div>
        <div>atomB: {JSON.stringify(atomBValue)}</div>
        <button onClick={() => setBigAtom((v) => ({ a: { b: v.a.b + 1 } }))}>
          inc bigAtom
        </button>
        <button onClick={() => setAtomA((v) => ({ b: v.b + 2 }))}>
          inc atomA
        </button>
        <button onClick={() => setAtomB((v) => v + 3)}>inc atomB</button>
      </>
    )
  }

  const { getByText, findByText } = rtl.render(
    <Provider>
      <Counter />
    </Provider>
  )

  await findByText('bigAtom: {"a":{"b":0}}')
  await findByText('atomA: {"b":0}')
  await findByText('atomB: 0')

  rtl.fireEvent.click(getByText('inc bigAtom'))
  await findByText('bigAtom: {"a":{"b":1}}')
  await findByText('atomA: {"b":1}')
  await findByText('atomB: 1')

  rtl.fireEvent.click(getByText('inc atomA'))
  await findByText('bigAtom: {"a":{"b":3}}')
  await findByText('atomA: {"b":3}')
  await findByText('atomB: 3')

  rtl.fireEvent.click(getByText('inc atomB'))
  await findByText('bigAtom: {"a":{"b":6}}')
  await findByText('atomA: {"b":6}')
  await findByText('atomB: 6')
})
